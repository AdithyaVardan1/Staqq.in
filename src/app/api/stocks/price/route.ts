import { NextRequest, NextResponse } from 'next/server';
import { angelOne } from '@/lib/angelone';
import { redis } from '@/lib/redis';
import { cdnCache } from '@/lib/http-cache';
import { yahoo } from '@/lib/yahoo';
import { getSnapshotPrice } from '@/lib/priceSnapshot';
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
            // Market is closed   cached closing price is the right answer, no need to hit Angel One
            if (!marketOpen) return NextResponse.json({ ...parsed, marketClosed: true }, { headers: cdnCache(300) });
            return NextResponse.json(parsed, { headers: cdnCache(PRICE_CDN_TTL) });
        } catch { /* fall through */ }
    }

    // The background refresh keeps a live snapshot of the whole universe   read
    // that before hitting any external API. This is the common, fast, reliable path.
    const snap = await getSnapshotPrice(ticker);
    if (snap) {
        return NextResponse.json(
            { ticker, price: snap.price, change: snap.changeAmount, changePercent: snap.change },
            { headers: cdnCache(PRICE_CDN_TTL) },
        );
    }

    // Snapshot miss (e.g. not in the universe, or before the first refresh)  
    // fetch from Angel One directly, then Yahoo.
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

        // Angel One's single-quote endpoint often leaves a lone token "unfetched"
        // (esp. when the screener's batches eat its rate budget). Fall back to
        // Yahoo   free, reliable, ~15-min delayed   so the page always has a price.
        const fromYahoo = await priceFromYahoo(ticker);
        if (fromYahoo) {
            const ttl = isMarketOpen() ? PRICE_CACHE_TTL_LIVE : secondsUntilMarketOpen();
            await redis.set(cacheKey, JSON.stringify(fromYahoo), ttl);
            return NextResponse.json(fromYahoo, { headers: cdnCache(PRICE_CDN_TTL) });
        }

        return NextResponse.json({ error: 'Price unavailable' }, { status: 503 });

    } catch (error: any) {
        console.error('[API/Price] Error:', error.message);
        // Last resort before erroring: Yahoo
        const fromYahoo = await priceFromYahoo(ticker);
        if (fromYahoo) return NextResponse.json(fromYahoo, { headers: cdnCache(PRICE_CDN_TTL) });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function priceFromYahoo(ticker: string) {
    try {
        const upper = ticker.toUpperCase();
        const sym = upper.endsWith('.NS') || upper.endsWith('.BO') ? upper : `${upper}.NS`;
        const q = await yahoo.getQuote(sym);
        if (q?.regularMarketPrice) {
            return {
                ticker,
                price: q.regularMarketPrice,
                change: q.regularMarketChange ?? 0,
                changePercent: q.regularMarketChangePercent ?? 0,
            };
        }
    } catch { /* ignore */ }
    return null;
}
