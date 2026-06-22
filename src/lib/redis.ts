import { Redis } from '@upstash/redis';

// ─── Redis (Upstash REST) ────────────────────────────────────────────
// We use Upstash's HTTP/REST client, not a TCP client like ioredis. REST has no
// persistent connections, which is the correct fit for Vercel's serverless
// functions (TCP clients exhaust connection limits under load).
//
// Two layers:
//   L1 — in-memory per warm instance (shields the REST layer from repeat reads
//        and keeps us well under Upstash's free command budget)
//   L2 — Upstash over REST, shared across all instances
//
// Everything fails soft: if UPSTASH_REDIS_REST_URL/TOKEN aren't set (or a call
// errors), reads fall back to the in-memory store and the app keeps working.

const memStore = new Map<string, { value: string; expiresAt: number }>();

function memGet(key: string): string | null {
    const entry = memStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { memStore.delete(key); return null; }
    return entry.value;
}

function memSet(key: string, value: string, ttlSeconds?: number) {
    memStore.set(key, {
        value,
        expiresAt: Date.now() + (ttlSeconds ? ttlSeconds * 1000 : 24 * 60 * 60 * 1000),
    });
}

function memDel(key: string) { memStore.delete(key); }

// undefined = not yet initialised, null = unavailable (env not set)
let client: Redis | null | undefined;

function getRest(): Redis | null {
    if (client !== undefined) return client;
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
        client = null;
        return null;
    }
    // automaticDeserialization off → values round-trip as raw strings, matching
    // the previous ioredis contract (callers JSON.parse themselves).
    client = new Redis({ url, token, automaticDeserialization: false });
    return client;
}

class RedisService {
    private async call<T>(fn: (client: Redis) => Promise<T>): Promise<T | null> {
        const c = getRest();
        if (!c) return null;
        try {
            return await fn(c);
        } catch {
            return null;
        }
    }

    // ── Strings ──────────────────────────────────────────────────────
    async get(key: string): Promise<string | null> {
        const mem = memGet(key);
        if (mem !== null) return mem;
        const val = await this.call(c => c.get<string>(key));
        if (val != null) memSet(key, val);
        return val ?? null;
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        memSet(key, value, ttlSeconds);
        await this.call(c => (ttlSeconds ? c.set(key, value, { ex: ttlSeconds }) : c.set(key, value)));
    }

    async del(key: string): Promise<void> {
        memDel(key);
        await this.call(c => c.del(key));
    }

    async mget(keys: string[]): Promise<(string | null)[]> {
        if (keys.length === 0) return [];
        const res = await this.call(c => c.mget<(string | null)[]>(...keys));
        return res ?? keys.map(() => null);
    }

    /** SET key value EX ttl NX. Returns true if set, false if it existed,
     *  null if the backend is unavailable (callers decide fail-open vs closed). */
    async setNx(key: string, value: string, ttlSeconds: number): Promise<boolean | null> {
        const c = getRest();
        if (!c) return null;
        try {
            const res = await c.set(key, value, { ex: ttlSeconds, nx: true });
            return res === 'OK';
        } catch {
            return null;
        }
    }

    async exists(key: string): Promise<boolean> {
        const res = await this.call(c => c.exists(key));
        return (res ?? 0) > 0;
    }

    async keys(pattern: string): Promise<string[]> {
        return (await this.call(c => c.keys(pattern))) ?? [];
    }

    async delMany(keys: string[]): Promise<void> {
        if (keys.length === 0) return;
        keys.forEach(memDel);
        await this.call(c => c.del(...keys));
    }

    /** Batched INCRBY + EXPIRE for many keys in one round-trip (spike buckets). */
    async recordCounts(entries: { key: string; amount: number }[], ttlSeconds: number): Promise<boolean> {
        if (entries.length === 0) return true;
        const res = await this.call(async (c) => {
            const p = c.pipeline();
            for (const e of entries) {
                p.incrby(e.key, e.amount);
                p.expire(e.key, ttlSeconds);
            }
            await p.exec();
            return true;
        });
        return res ?? false;
    }

    async incr(key: string, ttlSeconds?: number): Promise<number> {
        const res = await this.call(async (c) => {
            const val = await c.incr(key);
            if (ttlSeconds && Number(val) === 1) await c.expire(key, ttlSeconds);
            return val;
        });
        return Number(res ?? 0);
    }

    // ── Lists ────────────────────────────────────────────────────────
    async lpush(key: string, value: string, limit: number = 10) {
        return this.call(async (c) => {
            await c.lrem(key, 0, value);
            await c.lpush(key, value);
            await c.ltrim(key, 0, limit - 1);
        });
    }

    async lrange(key: string, start: number, stop: number): Promise<string[]> {
        return (await this.call(c => c.lrange(key, start, stop))) ?? [];
    }

    // ── Sorted sets ──────────────────────────────────────────────────
    async zadd(key: string, score: number, member: string) {
        return this.call(c => c.zadd(key, { score, member }));
    }

    async zincrby(key: string, increment: number, member: string) {
        return this.call(c => c.zincrby(key, increment, member));
    }

    async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
        return (await this.call(c => c.zrange(key, start, stop, { rev: true }))) ?? [];
    }

    async zcount(key: string, min: number | string, max: number | string): Promise<number> {
        return (await this.call(c => c.zcount(key, min as number, max as number))) ?? 0;
    }

    async zremrangebyscore(key: string, min: number | string, max: number | string): Promise<void> {
        await this.call(c => c.zremrangebyscore(key, min as number, max as number));
    }

    // ── Hashes ───────────────────────────────────────────────────────
    async hget(key: string, field: string): Promise<string | null> {
        return (await this.call(c => c.hget<string>(key, field))) ?? null;
    }

    async hdel(key: string, field: string) {
        return this.call(c => c.hdel(key, field));
    }

    async hSetWithExpiry(key: string, field: string, value: string, ttlSeconds: number) {
        return this.call(async (c) => {
            await c.hset(key, { [field]: value });
            await c.expire(key, ttlSeconds);
        });
    }
}

export const redis = new RedisService();
