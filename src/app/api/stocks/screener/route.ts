import { NextResponse } from 'next/server';
import { getUniverseList } from '@/lib/nse';
import { getTrendingTickers } from '@/lib/social';
import { redis } from '@/lib/redis';
import { angelOne } from '@/lib/angelone';
import { yahoo } from '@/lib/yahoo';
import { readSnapshot } from '@/lib/priceSnapshot';
import { isMarketOpen, secondsUntilMarketOpen } from '@/utils/market-hours';
import { cdnCache } from '@/lib/http-cache';

export const maxDuration = 60; // Yahoo batch pricing can take a few seconds on a cold cache

// ffmc thresholds in rupees (NSE classification)
const LARGE_CAP = 200_000_000_000; // ₹20,000 Cr+
const MID_CAP   =  50_000_000_000; // ₹5,000–20,000 Cr
// Small cap = below MID_CAP

// ── Fundamentals cache (P/E, market cap, sector) ─────────────────────
// These don't change real-time   cache 24 hours in Redis.
const FUNDAMENTALS_TTL = 86400; // 24h
const PRICE_TTL = 300;          // 5 minutes for real-time prices
const FETCH_LOCK_TTL = 15;      // seconds   lock held while fetching a batch

const SECTOR_MAP: Record<string, string[]> = {
    'Software': ['technology', 'software', 'it', 'digital', 'data', 'services'],
    'Bank': ['bank', 'banking'],
    'Finance': ['finance', 'financial', 'investment', 'insurance', 'capital', 'nbfc', 'broker'],
    'Pharma': ['pharma', 'health', 'drugs', 'bio', 'medical', 'hospital', 'pathology'],
    'Auto': ['auto', 'automotive', 'vehicle', 'tire', 'tyre', 'ancillary', 'parts'],
    'Energy': ['energy', 'oil', 'gas', 'power', 'utilities', 'petro', 'coal', 'electricity'],
    'FMCG': ['consumer', 'fmcg', 'beverage', 'food', 'retail', 'staple', 'personal care', 'household'],
    'Metals': ['metal', 'mining', 'steel', 'iron', 'aluminum', 'copper', 'zinc', 'lead'],
    'Infrastructure': ['infra', 'construction', 'cement', 'engineering', 'real estate', 'realty', 'building', 'materials'],
    'Telecom': ['telecom', 'communication', 'mobile', 'network'],
};

function matchesSector(filterValue: string, stockSector: string): boolean {
    if (!filterValue || filterValue === 'all') return true;
    const keywords = SECTOR_MAP[filterValue];
    if (!keywords) return stockSector.toLowerCase().includes(filterValue.toLowerCase());
    
    const stockSectorLower = stockSector.toLowerCase();
    return keywords.some(k => stockSectorLower.includes(k));
}

// ── Redis lock helper ─────────────────────────────────────────────────
// Prevents multiple concurrent cold-cache fetches for the same batch.
// Returns true if lock was acquired, false if someone else already holds it.
async function acquireLock(key: string): Promise<boolean> {
    const result = await redis.setNx(`lock:${key}`, '1', FETCH_LOCK_TTL);
    // null = Redis unavailable → fail open (allow fetch, no protection)
    return result ?? true;
}

async function releaseLock(key: string) {
    await redis.del(`lock:${key}`);
}

// Wait up to 12 seconds for a lock to release (polls every 300ms)
async function waitForLock(key: string): Promise<void> {
    const maxWait = 12000;
    const poll = 300;
    let waited = 0;
    while (waited < maxWait) {
        const held = await redis.exists(`lock:${key}`);
        if (!held) return; // released, or Redis unavailable → stop waiting
        await new Promise(r => setTimeout(r, poll));
        waited += poll;
    }
}

async function getFundamentals(ticker: string, tokensMap: Map<string, any> | null): Promise<{
    marketCap: number; peRatio: number; sector: string; return1Y: number;
} | null> {
    const key = `screener:fundamentals:${ticker}`;
    const cached = await redis.get(key);
    if (cached) {
        try { return JSON.parse(cached); } catch { /* fall through */ }
    }

    try {
        // 1. Try Yahoo for the basics (Market Cap, PE)
        const q = await yahoo.getQuote(`${ticker}.NS`);
        if (!q) return null;

        let return1Y = q.fiftyTwoWeekChangePercent || 0;

        // 2. Try Angel One for more accurate 1Y performance if available
        try {
            const instrument = tokensMap?.get(`NSE:${ticker}-EQ`);
            if (instrument) {
                const angelRes = await angelOne.getFundamentalData('NSE', String(instrument.token));
                if (angelRes?.status && angelRes.data?.PricePerformance?.['1Year']) {
                    return1Y = parseFloat(angelRes.data.PricePerformance['1Year']);
                    console.log(`[AngelOne] 1Y Return for ${ticker}: ${return1Y}%`);
                }
            }
        } catch (e: any) {
            console.error(`[AngelOne Fundamentals Error] ${ticker}:`, e.message);
        }

        const data = {
            marketCap: q.marketCap || 0,
            peRatio: q.trailingPE || q.forwardPE || 0,
            sector: q.sector || 'Unknown',
            return1Y,
        };
        await redis.set(key, JSON.stringify(data), FUNDAMENTALS_TTL);
        return data;
    } catch {
        return null;
    }
}

// ── Angel One real-time price cache ──────────────────────────────────
// Cached per-ticker in Redis for PRICE_TTL seconds.

async function getPriceCached(ticker: string): Promise<{
    price: number; change: number; changeAmount: number;
} | null> {
    const key = `screener:price:${ticker}`;
    const cached = await redis.get(key);
    if (cached) {
        try { return JSON.parse(cached); } catch { /* fall through */ }
    }
    return null; // caller will batch-fetch misses
}

async function storePriceCache(ticker: string, data: { price: number; change: number; changeAmount: number }) {
    // After market close, keep the closing price cached until next open to avoid stale re-fetches
    const ttl = isMarketOpen() ? PRICE_TTL : secondsUntilMarketOpen();
    await redis.set(`screener:price:${ticker}`, JSON.stringify(data), ttl);
}

// ── Batch fetch prices from Angel One ────────────────────────────────
// Uses a Redis lock so concurrent requests don't all slam Angel One.
// The first request acquires the lock, fetches, stores in cache.
// Concurrent requests wait for the lock, then read from cache.

async function fetchAngelOnePrices(
    tickers: string[],
    tokensMap: Map<string, any>
): Promise<Record<string, { price: number; change: number; changeAmount: number }>> {
    if (tickers.length === 0) return {};

    // Build a stable lock key from the sorted ticker list
    const lockKey = `screener:batch:${tickers.slice().sort().join(',')}`;
    const acquired = await acquireLock(lockKey);

    if (!acquired) {
        // Another request is already fetching this batch   wait, then read from cache
        await waitForLock(lockKey);
        const fromCache: Record<string, { price: number; change: number; changeAmount: number }> = {};
        for (const ticker of tickers) {
            const hit = await getPriceCached(ticker);
            if (hit) fromCache[ticker] = hit;
        }
        return fromCache;
    }

    try {
        const nseTokens: string[] = [];
        const tokenToTicker: Record<string, string> = {};

        for (const ticker of tickers) {
            const instrument = tokensMap.get(`NSE:${ticker}-EQ`);
            if (instrument) {
                nseTokens.push(String(instrument.token));
                tokenToTicker[String(instrument.token)] = ticker;
            }
        }

        if (nseTokens.length === 0) return {};

        const quotes = await angelOne.batchMarketData(nseTokens, tokenToTicker);
        const results: Record<string, { price: number; change: number; changeAmount: number }> = {};

        for (const [ticker, q] of Object.entries(quotes)) {
            if (q.ltp > 0) {
                results[ticker] = { price: q.ltp, change: q.percentChange, changeAmount: q.netChange };
            }
        }

        return results;
    } finally {
        await releaseLock(lockKey);
    }
}

// ── Yahoo Finance price fallback ─────────────────────────────────────
// Used when Angel One returns nothing (market closed / auth failure).
// Results are cached for PRICE_TTL seconds.
async function getYahooPriceFallback(ticker: string): Promise<{
    price: number; change: number; changeAmount: number;
} | null> {
    const key = `screener:price:${ticker}`;
    const cached = await redis.get(key);
    if (cached) {
        try { return JSON.parse(cached); } catch { /* fall through */ }
    }
    try {
        const q = await yahoo.getQuote(`${ticker}.NS`);
        if (!q || !q.regularMarketPrice) return null;
        const price = q.regularMarketPrice;
        const change = q.regularMarketChangePercent || 0;
        const changeAmount = q.regularMarketChange || 0;
        const data = { price, change, changeAmount };
        await redis.set(key, JSON.stringify(data), PRICE_TTL);
        return data;
    } catch (e: any) {
        console.error(`[Yahoo Fallback] Error for ${ticker}:`, e.message);
        return null;
    }
}

// ── Route handler ─────────────────────────────────────────────────────

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const offset    = parseInt(searchParams.get('offset') || '0');
        const limit     = parseInt(searchParams.get('limit') || '10');
        const sortBy    = searchParams.get('sortBy') || 'marketCap';
        const priceMin  = parseFloat(searchParams.get('priceMin') || '0');
        const priceMax  = parseFloat(searchParams.get('priceMax') || '1000000');
        const sector    = searchParams.get('sector') || 'all';
        const mcap      = searchParams.get('mcap') || 'all'; // all | large | mid | small
        const return1Y  = searchParams.get('return1Y') || 'all'; // all | positive | top10 | top30

        let universe = getUniverseList();

        // Live prices come from the background-refreshed snapshot (1 read for the
        // whole universe). Yahoo is only a fallback for symbols not yet in it.
        const snapshot = await readSnapshot();

        // Global Sort BEFORE pagination
        if (sortBy === 'price-high' || sortBy === 'price-low') {
            universe = [...universe].sort((a, b) => {
                const priceA = snapshot?.data?.[a.symbol]?.price || 0;
                const priceB = snapshot?.data?.[b.symbol]?.price || 0;
                return sortBy === 'price-high' ? priceB - priceA : priceA - priceB;
            });
        }

        // Depth-search: scan stocks starting at offset
        const MAX_SCAN = 200;
        const CHUNK_SIZE = 20; // smaller chunks for faster iteration
        const matchedStocks: any[] = [];
        let currentIdx = offset;

        while (currentIdx < universe.length && currentIdx - offset < MAX_SCAN) {
            const chunk = universe.slice(currentIdx, currentIdx + CHUNK_SIZE);
            if (chunk.length === 0) break;

            // 1. Read prices from the live snapshot
            const priceMisses: string[] = [];
            const priceHits: Record<string, { price: number; change: number; changeAmount: number }> = {};

            for (const stock of chunk) {
                const p = snapshot?.data[stock.symbol];
                if (p && p.price > 0) {
                    priceHits[stock.symbol] = { price: p.price, change: p.change, changeAmount: p.changeAmount };
                }
                else priceMisses.push(stock.symbol);
            }

            // 2. Yahoo batch for anything the snapshot doesn't have yet (e.g. before
            //    the first refresh has run)   keeps the screener populated regardless.
            if (priceMisses.length > 0) {
                const yq = await yahoo.getBatchQuotes(priceMisses);
                for (const [t, q] of Object.entries(yq)) {
                    if (q.currentPrice > 0) {
                        priceHits[t] = {
                            price: q.currentPrice,
                            change: q.regularMarketChangePercent,
                            changeAmount: q.regularMarketChange,
                        };
                    }
                }
            }

            // 4. Fetch fundamentals only for stocks that have a price (from cache)
            const stocksWithPrice = chunk.filter(s => priceHits[s.symbol]?.price > 0);
            
            console.log(`[Screener Chunk] Found ${stocksWithPrice.length} stocks with price out of ${chunk.length}`);

            const fundamentalsArr = await Promise.allSettled(
                stocksWithPrice.map(s => getFundamentals(s.symbol, null))
            );

            // 5. Build enriched stocks and apply filters
            for (let j = 0; j < stocksWithPrice.length; j++) {
                const stock = stocksWithPrice[j];
                const priceData = priceHits[stock.symbol];
                if (!priceData || priceData.price <= 0) continue;

                const fundamentalsResult = fundamentalsArr[j];
                const fundamentals = fundamentalsResult.status === 'fulfilled' ? fundamentalsResult.value : null;

                const price = priceData.price;
                const marketCap = fundamentals?.marketCap || 0;
                const peRatio = fundamentals?.peRatio || 0;
                const stockSector = stock.sector || fundamentals?.sector || 'Unknown';
                const return1YVal = fundamentals?.return1Y || 0;

                // Apply filters
                if (price < priceMin || price > priceMax) continue;
                
                if (!matchesSector(sector, stockSector)) continue;

                if (mcap === 'large' && marketCap < LARGE_CAP) continue;
                if (mcap === 'mid'   && (marketCap < MID_CAP || marketCap >= LARGE_CAP)) continue;
                if (mcap === 'small' && marketCap >= MID_CAP) continue;

                if (return1Y === 'positive' && return1YVal <= 0) continue;
                if (return1Y === 'top10'    && return1YVal < 10) continue;
                if (return1Y === 'top30'    && return1YVal < 30) continue;

                if (matchedStocks.length < limit) {
                    matchedStocks.push({
                        ticker: stock.symbol,
                        name: stock.name,
                        price,
                        change: priceData.change,
                        changeAmount: priceData.changeAmount,
                        marketCap,
                        peRatio,
                        sector: stockSector,
                        return1Y: return1YVal,
                        sparklineData: [],
                    });
                }
            }

            currentIdx += chunk.length;
            if (matchedStocks.length >= limit) break;
        }

        return NextResponse.json({
            stocks: matchedStocks,
            nextOffset: currentIdx,
            hasMore: currentIdx < universe.length,
            total: universe.length,
        }, { headers: cdnCache(300) });

    } catch (err: any) {
        console.error('[Screener] Error:', err);
        return NextResponse.json({ error: 'Screener unavailable' }, { status: 500 });
    }
}
