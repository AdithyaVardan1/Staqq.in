import { NextRequest, NextResponse } from 'next/server';
import { angelOne } from '@/lib/angelone';
import { redis } from '@/lib/redis';
import { isMarketOpen, secondsUntilMarketOpen } from '@/utils/market-hours';

export const dynamic = 'force-dynamic';

const PRICE_CACHE_TTL_LIVE = 10; // 10s during market hours

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
            if (!marketOpen) return NextResponse.json({ ...parsed, marketClosed: true });
            return NextResponse.json(parsed);
        } catch { /* fall through */ }
    }

    // Market closed and nothing cached — nothing useful to fetch from Angel One
    if (!marketOpen) {
        return NextResponse.json({ error: 'Market closed, no cached price available' }, { status: 503 });
    }

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
            return NextResponse.json(result);
        }

        return NextResponse.json({ error: 'Price unavailable' }, { status: 503 });

    } catch (error: any) {
        console.error('[API/Price] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
