import { NextRequest, NextResponse } from 'next/server';
import { angelOne } from '@/lib/angelone';
import { redis } from '@/lib/redis';
import { cdnCache } from '@/lib/http-cache';
import { isMarketOpen, secondsUntilMarketOpen } from '@/utils/market-hours';

const PRICE_CACHE_TTL_LIVE = 10; // 10s during market hours
const PRICE_CDN_TTL = 15; // edge-cache live prices briefly; closed market caches longer below

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const ticker = searchParams.get('ticker');

    if (!ticker) {
        return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    const cacheKey = `live:price:${ticker.toUpperCase()}`;
    const marketOpen = isMarketOpen();

    // Always serve from cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            // Market is closed — cached closing price is the right answer, no need to hit Angel One
            if (!marketOpen) return NextResponse.json({ ...parsed, marketClosed: true }, { headers: cdnCache(300) });
            return NextResponse.json(parsed, { headers: cdnCache(PRICE_CDN_TTL) });
        } catch { /* fall through */ }
    }

    // Nothing cached — fetch from Angel One. It returns the last close when the
    // market is closed, so this works outside market hours too (and warms the
    // cache until the next open).
    try {
        const instrument = await angelOne.findInstrument(ticker);
        if (!instrument) {
            return NextResponse.json({ error: `Instrument not found for ${ticker}` }, { status: 404 });
        }

        const quote = await angelOne.getFullQuote(instrument.exchange, instrument.symbol, String(instrument.token));

        if (quote?.status && quote.data?.length > 0) {
            const data = quote.data[0];
            const result = {
                ticker,
                price: parseFloat(data.ltp),
                change: parseFloat(data.netChange),
                changePercent: parseFloat(data.percentChange),
            };
            // If market just closed by the time we get the response, cache until next open
            const ttl = isMarketOpen() ? PRICE_CACHE_TTL_LIVE : secondsUntilMarketOpen();
            await redis.set(cacheKey, JSON.stringify(result), ttl);
            return NextResponse.json(result, { headers: cdnCache(PRICE_CDN_TTL) });
        }

        return NextResponse.json({ error: 'Price unavailable' }, { status: 503 });

    } catch (error: any) {
        console.error('[API/Price] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
