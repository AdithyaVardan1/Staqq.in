import { NextRequest, NextResponse } from 'next/server';
import { angelOne } from '@/lib/angelone';
import { redis } from '@/lib/redis';
import { cdnCache } from '@/lib/http-cache';

// Angel One limits: 3 req/sec, 180/min, 5,000/hour for getCandleData
// These TTLs ensure we never hit rate limits even with many concurrent users.
// Each unique ticker+range is one Angel One call per TTL window.
const CACHE_TTL: Record<string, number> = {
    '1D':  5 * 60,          // 5 min  — intraday refreshes matter
    '1W':  15 * 60,         // 15 min
    '1M':  60 * 60,         // 1 hour
    '3M':  60 * 60,
    '6M':  6 * 60 * 60,     // 6 hours
    '1Y':  24 * 60 * 60,    // 1 day
    '5Y':  24 * 60 * 60,
    'ALL': 24 * 60 * 60,
};

// Angel One interval + date range per chart range
const RANGE_CONFIG: Record<string, { interval: string; daysBack: number }> = {
    '1D':  { interval: 'ONE_MINUTE',    daysBack: 1   },
    '1W':  { interval: 'FIVE_MINUTE',   daysBack: 7   },
    '1M':  { interval: 'FIFTEEN_MINUTE',daysBack: 30  },
    '3M':  { interval: 'ONE_DAY',       daysBack: 90  },
    '6M':  { interval: 'ONE_DAY',       daysBack: 180 },
    '1Y':  { interval: 'ONE_DAY',       daysBack: 365 },
    '5Y':  { interval: 'ONE_DAY',       daysBack: 1825},
    'ALL': { interval: 'ONE_DAY',       daysBack: 3650},
};

function formatAngelDate(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatLabel(d: Date, range: string): string {
    if (range === '1D') return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
    if (range === '1W') return d.toLocaleDateString('en-IN', { weekday: 'short', hour: 'numeric' });
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

// In-process lock: if two requests for the same ticker+range arrive concurrently,
// only one hits Angel One; the other waits and reads from cache.
const inflightRequests = new Map<string, Promise<any>>();

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const ticker = searchParams.get('ticker')?.toUpperCase();
    const range = searchParams.get('range') || '1M';

    if (!ticker) return NextResponse.json({ error: 'Ticker required' }, { status: 400 });

    const cacheKey = `history:${ticker}:${range}`;
    const cdnTtl = CACHE_TTL[range] ?? 3600;

    // L1/L2 cache check — most requests end here
    const cached = await redis.get(cacheKey);
    if (cached) {
        try { return NextResponse.json(JSON.parse(cached), { headers: cdnCache(cdnTtl) }); } catch { /* fall through */ }
    }

    // Deduplicate concurrent requests for the same ticker+range
    if (inflightRequests.has(cacheKey)) {
        try {
            const result = await inflightRequests.get(cacheKey);
            return NextResponse.json(result);
        } catch {
            return NextResponse.json({ error: 'History unavailable' }, { status: 500 });
        }
    }

    const fetchPromise = (async () => {
        const config = RANGE_CONFIG[range] || RANGE_CONFIG['1M'];
        const now = new Date();
        const fromDate = new Date();
        fromDate.setDate(now.getDate() - config.daysBack);

        // For 1D, start from market open
        if (range === '1D') {
            fromDate.setHours(9, 15, 0, 0);
            // If before market open today, go back to yesterday
            if (now.getHours() < 9) fromDate.setDate(fromDate.getDate() - 1);
        }

        const instrument = await angelOne.findInstrument(ticker);
        if (!instrument) throw new Error(`Instrument not found: ${ticker}`);

        const response = await angelOne.getCandleData(
            instrument.exchange,
            instrument.token,
            config.interval,
            formatAngelDate(fromDate),
            formatAngelDate(now),
        );

        if (!response?.status || !response.data?.length) {
            throw new Error('No candle data returned');
        }

        // Angel One candle format: [timestamp, open, high, low, close, volume]
        const history = response.data.map((candle: any[]) => ({
            date: formatLabel(new Date(candle[0]), range),
            value: candle[4], // close price
            open: candle[1],
            high: candle[2],
            low: candle[3],
            volume: candle[5],
        }));

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
