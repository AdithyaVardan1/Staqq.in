import { NextResponse } from 'next/server';
import { getNifty500 } from '@/lib/nse';
import { getTrendingTickers } from '@/lib/social';
import { redis } from '@/lib/redis';
import { angelOne } from '@/lib/angelone';
import { yahoo } from '@/lib/yahoo';

export const dynamic = 'force-dynamic';

// ffmc thresholds in rupees (NSE classification)
const LARGE_CAP = 200_000_000_000; // ₹20,000 Cr+
const MID_CAP   =  50_000_000_000; // ₹5,000–20,000 Cr
// Small cap = below MID_CAP

// ── Fundamentals cache (P/E, market cap, sector) ─────────────────────
// These don't change real-time — cache 24 hours in Redis.
const FUNDAMENTALS_TTL = 86400; // 24h
const PRICE_TTL = 300;          // 5 minutes for real-time prices
const FETCH_LOCK_TTL = 15;      // seconds — lock held while fetching a batch

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
    const client = redis.getClient();
    if (!client) return true; // Redis down → allow fetch (no protection, but works)
    try {
        const result = await client.set(`lock:${key}`, '1', 'EX', FETCH_LOCK_TTL, 'NX');
        return result === 'OK';
    } catch {
        return true; // fail open
    }
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
        const client = redis.getClient();
        if (!client) return;
        try {
            const held = await client.exists(`lock:${key}`);
            if (!held) return;
        } catch { return; }
        await new Promise(r => setTimeout(r, poll));
        waited += poll;
    }
}

async function getFundamentals(ticker: string, tokensMap: Map<string, any>): Promise<{
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
            const instrument = tokensMap.get(`NSE:${ticker}-EQ`);
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
    await redis.set(`screener:price:${ticker}`, JSON.stringify(data), PRICE_TTL);
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
        // Another request is already fetching this batch — wait, then read from cache
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

        const universe = await getNifty500();

        // Load instrument master (cached in file + memory, 24h TTL)
        const tokensMap = await angelOne.getInstrumentTokens();
        if (!tokensMap || tokensMap.size === 0) {
            return NextResponse.json({ error: 'Instrument list unavailable' }, { status: 503 });
        }

        // Depth-search: scan stocks starting at offset
        // Strategy: try Angel One batch first; fallback to Yahoo per-ticker if AO returns nothing.
        const MAX_SCAN = 200;
        const CHUNK_SIZE = 20; // smaller chunks for faster iteration
        const matchedStocks: any[] = [];
        let currentIdx = offset;

        while (currentIdx < universe.length && currentIdx - offset < MAX_SCAN) {
            const chunk = universe.slice(currentIdx, currentIdx + CHUNK_SIZE);
            if (chunk.length === 0) break;

            // 1. Check per-ticker price cache first
            const priceMisses: string[] = [];
            const priceHits: Record<string, { price: number; change: number; changeAmount: number }> = {};

            for (const stock of chunk) {
                const hit = await getPriceCached(stock.symbol);
                if (hit) priceHits[stock.symbol] = hit;
                else priceMisses.push(stock.symbol);
            }

            // 2. Batch-fetch price misses from Angel One
            if (priceMisses.length > 0) {
                const fresh = await fetchAngelOnePrices(priceMisses, tokensMap);
                for (const [ticker, data] of Object.entries(fresh)) {
                    priceHits[ticker] = data;
                    await storePriceCache(ticker, data);
                }

                // 3. Yahoo fallback for anything Angel One missed
                const angelMisses = priceMisses.filter(t => !priceHits[t]);
                if (angelMisses.length > 0) {
                    // Fetch in parallel but cap concurrency at 5 to avoid rate limiting
                    const CONCURRENCY = 5;
                    for (let i = 0; i < angelMisses.length; i += CONCURRENCY) {
                        const batch = angelMisses.slice(i, i + CONCURRENCY);
                        const results = await Promise.allSettled(
                            batch.map(t => getYahooPriceFallback(t))
                        );
                        results.forEach((r, idx) => {
                            if (r.status === 'fulfilled' && r.value) {
                                priceHits[batch[idx]] = r.value;
                            }
                        });
                    }
                }
            }

            // 4. Fetch fundamentals only for stocks that have a price (from cache)
            const stocksWithPrice = chunk.filter(s => priceHits[s.symbol]?.price > 0);
            
            console.log(`[Screener Chunk] Found ${stocksWithPrice.length} stocks with price out of ${chunk.length}`);

            const fundamentalsArr = await Promise.allSettled(
                stocksWithPrice.map(s => getFundamentals(s.symbol, tokensMap))
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
                const return1YVal = stock.return1Y || fundamentals?.return1Y || 0;

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
        });

    } catch (err: any) {
        console.error('[Screener] Error:', err);
        return NextResponse.json({ error: 'Screener unavailable' }, { status: 500 });
    }
}
