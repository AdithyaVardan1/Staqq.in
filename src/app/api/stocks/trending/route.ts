import { NextResponse } from 'next/server';
import { getNifty500, type NseStock } from '@/lib/nse';
import { redis } from '@/lib/redis';
import { cdnCache } from '@/lib/http-cache';

const CACHE_TTL = 60;

function toCard(s: NseStock, extra?: Record<string, number>) {
    return {
        symbol: s.symbol,
        name: s.name,
        ltp: s.price,
        change: s.change,
        market_cap: s.marketCap,
        sector: s.sector,
        high_52w: s.yearHigh,
        low_52w: s.yearLow,
        pe_ratio: 0,
        ...extra,
    };
}

export async function GET() {
    try {
        const cacheKey = 'trending:categories';
        const cached = await redis.get(cacheKey);
        if (cached) {
            try { return NextResponse.json(JSON.parse(cached), { headers: cdnCache(60) }); } catch { /* fall through */ }
        }

        const stocks = await getNifty500();

        const categories = {
            top_gainers: [...stocks]
                .sort((a, b) => b.change - a.change)
                .slice(0, 20)
                .map(s => toCard(s)),

            top_losers: [...stocks]
                .sort((a, b) => a.change - b.change)
                .slice(0, 20)
                .map(s => toCard(s)),

            volume_shockers: [...stocks]
                .sort((a, b) => b.volume - a.volume)
                .slice(0, 20)
                .map(s => toCard(s, { spike: parseFloat((s.volume / 100000).toFixed(1)) })),

            breakouts_52w: stocks
                .filter(s => s.nearHigh <= 2)
                .sort((a, b) => a.nearHigh - b.nearHigh)
                .slice(0, 20)
                .map(s => toCard(s)),

            breakdowns_52w: stocks
                .filter(s => s.nearLow >= -2)
                .sort((a, b) => b.nearLow - a.nearLow)
                .slice(0, 20)
                .map(s => toCard(s)),

            outperformers: stocks
                .filter(s => s.return1Y > 0)
                .sort((a, b) => b.return1Y - a.return1Y)
                .slice(0, 20)
                .map(s => toCard(s, { rs: parseFloat(s.return1Y.toFixed(1)) })),
        };

        const result = { categories };
        await redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
        return NextResponse.json(result, { headers: cdnCache(60) });

    } catch (error: any) {
        console.error('[Trending] Error:', error.message);
        return NextResponse.json({ categories: {} }, { status: 500 });
    }
}
