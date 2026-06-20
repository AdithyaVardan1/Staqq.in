import { redis } from './redis';
import fs from 'fs';
import path from 'path';

// /tmp is writable on Vercel; process.cwd() is read-only there
const CACHE_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data');
const CACHE_FILE = path.join(CACHE_DIR, 'stock_cache.json');

class StockCache {
    private TTL = 600; // 10 minutes (Redis only)
    private memoryCache: Map<string, { data: any, timestamp: number }> = new Map();
    private isRedisAvailable = true; // Assume true initially

    constructor() {
        this.loadFromFile();
    }

    private loadFromFile() {
        try {
            if (fs.existsSync(CACHE_FILE)) {
                const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
                const data = JSON.parse(raw);
                // Convert plain object to Map
                Object.entries(data).forEach(([key, value]: [string, any]) => {
                    this.memoryCache.set(key, value);
                });
                console.log(`[StockCache] Loaded ${this.memoryCache.size} items from file cache`);
            }
        } catch (e) {
            console.error('[StockCache] Failed to load file cache:', e);
        }
    }

    private saveToFile() {
        try {
            const data = Object.fromEntries(this.memoryCache.entries());
            if (!fs.existsSync(path.dirname(CACHE_FILE))) {
                fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
            }
            fs.writeFileSync(CACHE_FILE, JSON.stringify(data));
        } catch (e) {
            console.error('[StockCache] Failed to save file cache:', e);
        }
    }

    async get(key: string): Promise<any | null> {
        // 1. Try Memory (Fastest)
        const memEntry = this.memoryCache.get(key);
        if (memEntry) {
            // Check expiry for memory cache too (e.g. 24 hours to keep fresh but allow offline)
            if (Date.now() - memEntry.timestamp < 24 * 60 * 60 * 1000) {
                return memEntry.data;
            }
        }

        // 2. Try Redis (if available)
        try {
            if (this.isRedisAvailable) {
                const data = await redis.get(`stock_cache:${key}`);
                if (data) {
                    const parsed = JSON.parse(data);
                    // Update memory cache
                    this.memoryCache.set(key, { data: parsed, timestamp: Date.now() });
                    return parsed;
                }
            }
        } catch (e) {
            // Redis failed, mark as unavailable for this session to avoid timeouts
            // But actually redis.ts handles timeouts well, so we just log clearly
            // console.warn('[StockCache] Redis get failed, falling back to file/memory only');
        }

        return null;
    }

    async set(key: string, data: any, ttlSeconds?: number): Promise<void> {
        // 1. Update Memory & File
        this.memoryCache.set(key, { data, timestamp: Date.now() });
        this.saveToFile(); // Persist immediately for dev safety (or debounce in prod)

        // 2. Update Redis (Fire & Forget)
        try {
            if (this.isRedisAvailable) {
                await redis.set(`stock_cache:${key}`, JSON.stringify(data), ttlSeconds ?? this.TTL);
            }
        } catch (e) {
            // console.warn('[StockCache] Redis set failed');
        }
    }

    async clear(): Promise<void> {
        this.memoryCache.clear();
        if (fs.existsSync(CACHE_FILE)) fs.unlinkSync(CACHE_FILE);

        const client = redis.getClient();
        if (client) {
            try {
                const keys = await client.keys('stock_cache:*');
                if (keys.length > 0) await client.del(...keys);
            } catch (e) { }
        }
    }
}

// Global instance
export const stockCache = new StockCache();
