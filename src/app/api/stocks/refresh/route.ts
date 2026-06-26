import { NextRequest, NextResponse } from 'next/server';
import { angelOne } from '@/lib/angelone';
import { yahoo } from '@/lib/yahoo';
import { getUniverseList } from '@/lib/nse';
import { writeSnapshot, type Snapshot, type PriceEntry } from '@/lib/priceSnapshot';
import { verifyCronRequest } from '@/lib/cron-auth';

export const maxDuration = 60;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Background job: pull live prices for the whole universe and write one snapshot.
// Angel One is real-time but rate-limited to 1 req/sec with 50 symbols/call, so
// we fetch in spaced groups of 50. Yahoo fills anything Angel One misses.
export async function POST(req: NextRequest) {
    if (!(await verifyCronRequest(req))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const universe = getUniverseList();
    const data: Record<string, PriceEntry> = {};

    // 1. Angel One — real-time, 50 tokens/call, one call per second
    try {
        const tokensMap = await angelOne.getInstrumentTokens();
        if (tokensMap?.size) {
            const groups: { tokens: string[]; map: Record<string, string> }[] = [];
            let cur = { tokens: [] as string[], map: {} as Record<string, string> };
            for (const c of universe) {
                const inst = tokensMap.get(`NSE:${c.symbol}-EQ`);
                if (!inst?.token) continue;
                cur.tokens.push(String(inst.token));
                cur.map[String(inst.token)] = c.symbol;
                if (cur.tokens.length === 50) { groups.push(cur); cur = { tokens: [], map: {} }; }
            }
            if (cur.tokens.length) groups.push(cur);

            for (let i = 0; i < groups.length; i++) {
                const quotes = await angelOne.batchMarketData(groups[i].tokens, groups[i].map);
                for (const [sym, q] of Object.entries(quotes)) {
                    if (q.ltp > 0) {
                        data[sym] = {
                            price: q.ltp,
                            change: q.percentChange,
                            changeAmount: q.netChange,
                            high52: q.week52High,
                            low52: q.week52Low,
                        };
                    }
                }
                if (i < groups.length - 1) await sleep(1100); // respect 1 req/sec
            }
        }
    } catch (err: any) {
        console.error('[Refresh] Angel One error:', err.message);
    }

    // 2. Yahoo fallback for any symbols Angel One didn't return
    const missing = universe.filter((c) => !data[c.symbol]).map((c) => c.symbol);
    if (missing.length) {
        try {
            const yq = await yahoo.getBatchQuotes(missing);
            for (const [sym, q] of Object.entries(yq)) {
                if (q.currentPrice > 0) {
                    data[sym] = {
                        price: q.currentPrice,
                        change: q.regularMarketChangePercent,
                        changeAmount: q.regularMarketChange,
                    };
                }
            }
        } catch (err: any) {
            console.error('[Refresh] Yahoo fallback error:', err.message);
        }
    }

    const snap: Snapshot = { updatedAt: Date.now(), data };
    await writeSnapshot(snap);

    return NextResponse.json({ ok: true, count: Object.keys(data).length, updatedAt: snap.updatedAt });
}
