import { redis } from './redis';
import { angelOne } from './angelone';
import nifty500List from '@/data/nifty500.json';

// The stock universe (which 500 names + their sectors) is static reference data
// bundled in the repo — NSE's live index API blocks cloud IPs, so we no longer
// depend on it. Every live number (price, change, volume, 52-week range) comes
// from Angel One, which is reliable from the server.
//
// Data lives in cache for 5 minutes, "fresh" for 55s. After 55s the next request
// triggers a background refresh while serving the stale-but-not-expired data.
const DATA_TTL = 300;  // keep data in cache 5 minutes
const FRESH_TTL = 55;  // background refresh triggers after 55s

export interface Constituent { symbol: string; name: string; sector: string; }
const UNIVERSE = nifty500List as Constituent[];

/** The static NIFTY 500 constituent list (always available, no network). */
export function getUniverseList(): Constituent[] {
    return UNIVERSE;
}

export interface NseStock {
    symbol: string;
    name: string;
    sector: string;
    price: number;
    change: number;       // % change
    changeAmount: number; // absolute change
    volume: number;
    marketCap: number;    // ffmc in rupees
    yearHigh: number;
    yearLow: number;
    return1Y: number;     // perChange365d
    nearHigh: number;     // % below 52w high (lower = closer to high)
    nearLow: number;      // negative % above 52w low (closer to 0 = near low)
}

let refreshPromise: Promise<NseStock[]> | null = null;

async function fetchFromAngel(): Promise<NseStock[]> {
    // Resolve Angel One tokens for every constituent from the instrument master.
    const tokensMap = await angelOne.getInstrumentTokens();
    const nseTokens: string[] = [];
    const tokenToTicker: Record<string, string> = {};
    for (const c of UNIVERSE) {
        const inst = tokensMap.get(`NSE:${c.symbol}-EQ`);
        if (inst?.token) {
            nseTokens.push(String(inst.token));
            tokenToTicker[String(inst.token)] = c.symbol;
        }
    }

    // One batch of live quotes for the whole universe (50 tokens per call).
    const quotes = await angelOne.batchMarketData(nseTokens, tokenToTicker);

    const stocks: NseStock[] = UNIVERSE.map((c) => {
        const q = quotes[c.symbol];
        const price = q?.ltp ?? 0;
        const yearHigh = q?.week52High ?? 0;
        const yearLow = q?.week52Low ?? 0;
        return {
            symbol: c.symbol,
            name: c.name,
            sector: c.sector,
            price,
            change: q?.percentChange ?? 0,
            changeAmount: q?.netChange ?? 0,
            volume: q?.volume ?? 0,
            marketCap: 0, // enriched per-stock from fundamentals (Yahoo) downstream
            yearHigh,
            yearLow,
            return1Y: 0,  // enriched per-stock from fundamentals downstream
            // % below 52w high (0 = at high); large when far below
            nearHigh: yearHigh > 0 ? ((yearHigh - price) / yearHigh) * 100 : 999,
            // negated % above 52w low (0 = at low) to match prior sign convention
            nearLow: yearLow > 0 ? -((price - yearLow) / yearLow) * 100 : -999,
        };
    }).filter((s) => s.price > 0);

    const payload = JSON.stringify(stocks);
    await Promise.all([
        redis.set('nse:nifty500:data', payload, DATA_TTL),
        redis.set('nse:nifty500:fresh', '1', FRESH_TTL),
    ]);
    return stocks;
}

export async function getNifty500(): Promise<NseStock[]> {
    const [cached, isFresh] = await Promise.all([
        redis.get('nse:nifty500:data'),
        redis.get('nse:nifty500:fresh'),
    ]);

    if (cached) {
        if (!isFresh && !refreshPromise) {
            // Stale — kick off background refresh, serve current data now
            refreshPromise = fetchFromAngel().finally(() => { refreshPromise = null; });
        }
        try { return JSON.parse(cached); } catch { /* fall through to live fetch */ }
    }

    // Cold start — wait for live data (only happens once per 5 minutes max)
    if (refreshPromise) return refreshPromise;
    refreshPromise = fetchFromAngel().finally(() => { refreshPromise = null; });
    return refreshPromise;
}
