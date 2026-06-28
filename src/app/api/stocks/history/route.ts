import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { cdnCache } from '@/lib/http-cache';
import { yahoo } from '@/lib/yahoo';

// History/candles come from Yahoo (free, no tight rate limit) instead of Angel
// One, whose getCandleData is rate-limited and flaky. Results are cached per
// ticker+range; cold fetches are deduped so concurrent requests share one call.
const CACHE_TTL: Record<string, number> = {
    '1D':  5 * 60,          // 5 min    intraday refreshes matter
    '1W':  15 * 60,         // 15 min
    '1M':  60 * 60,         // 1 hour
    '3M':  60 * 60,
    '6M':  6 * 60 * 60,     // 6 hours
    '1Y':  24 * 60 * 60,    // 1 day
    '5Y':  24 * 60 * 60,
    'ALL': 24 * 60 * 60,
};

const inflightRequests = new Map<string, Promise<any>>();

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const ticker = searchParams.get('ticker')?.toUpperCase();
    const range = searchParams.get('range') || '1M';

    if (!ticker) return NextResponse.json({ error: 'Ticker required' }, { status: 400 });

    const cacheKey = `history:${ticker}:${range}`;
    const cdnTtl = CACHE_TTL[range] ?? 3600;

    // L1/L2 cache check   most requests end here
    const cached = await redis.get(cacheKey);
    if (cached) {
        try { return NextResponse.json(JSON.parse(cached), { headers: cdnCache(cdnTtl) }); } catch { /* fall through */ }
    }

    // Deduplicate concurrent requests for the same ticker+range
    if (inflightRequests.has(cacheKey)) {
        try {
            const result = await inflightRequests.get(cacheKey);
            return NextResponse.json(result, { headers: cdnCache(cdnTtl) });
        } catch {
            return NextResponse.json({ error: 'History unavailable' }, { status: 500 });
        }
    }

    const fetchPromise = (async () => {
        const history = await yahoo.getChart(ticker, range);
        if (!history.length) throw new Error('No history data returned');
        const payload = { ticker, range, history };
        await redis.set(cacheKey, JSON.stringify(payload), CACHE_TTL[range] ?? 3600);
        return payload;
    })();

    inflightRequests.set(cacheKey, fetchPromise);
    fetchPromise.finally(() => inflightRequests.delete(cacheKey));

    try {
        const result = await fetchPromise;
        return NextResponse.json(result, { headers: cdnCache(cdnTtl) });
    } catch (error: any) {
        console.error('[History]', ticker, range, error.message);
        return NextResponse.json({ error: 'History unavailable' }, { status: 500 });
    }
}
