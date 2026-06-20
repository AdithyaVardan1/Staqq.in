import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/utils/supabase/mobile-auth';
import { getSubscription } from '@/lib/subscription';
import { getCryptoSignals } from '@/lib/crypto-signals';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

// Signals are identical for all users on the same tier, so cache the two
// computed variants in Redis. This route reads auth (Pro vs free) so it can't
// be edge-cached, but the cache spares the upstream signal computation.
const SIGNALS_TTL = 60;

export async function GET(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);
        let isPro = false;

        if (user) {
            const sub = await getSubscription(user.id);
            isPro = sub.tier === 'pro';
        }

        const cacheKey = `crypto:signals:${isPro ? 'pro' : 'free'}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
            try { return NextResponse.json(JSON.parse(cached)); } catch { /* fall through */ }
        }

        const signals = await getCryptoSignals(isPro);
        const payload = { signals, count: signals.length };
        await redis.set(cacheKey, JSON.stringify(payload), SIGNALS_TTL);
        return NextResponse.json(payload);
    } catch (error: any) {
        console.error('[Crypto Signals API]', error.message);
        return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 });
    }
}
