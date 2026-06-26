import { redis } from './redis';

// A single, continuously-refreshed snapshot of live prices for the whole NIFTY
// 500 universe. A background job (/api/stocks/refresh, fired by QStash) writes
// it every couple of minutes; the screener / price / trending routes only READ
// it — so reads never depend on Angel One/Yahoo being up at request time.
//
// Stored as ONE Redis key (not per-ticker) so a refresh costs 1 write and a read
// costs 1 command — keeping us well within Upstash's free budget.

const SNAPSHOT_KEY = 'stocks:snapshot';
const SNAPSHOT_TTL = 6 * 60 * 60; // 6h — comfortably survives off-hours between refreshes

export interface PriceEntry {
    price: number;
    change: number;       // % change
    changeAmount: number; // absolute change
    high52?: number;
    low52?: number;
}

export interface Snapshot {
    updatedAt: number;
    data: Record<string, PriceEntry>;
}

export async function writeSnapshot(snap: Snapshot): Promise<void> {
    await redis.set(SNAPSHOT_KEY, JSON.stringify(snap), SNAPSHOT_TTL);
}

export async function readSnapshot(): Promise<Snapshot | null> {
    const raw = await redis.get(SNAPSHOT_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as Snapshot; } catch { return null; }
}

export async function getSnapshotPrice(symbol: string): Promise<PriceEntry | null> {
    const snap = await readSnapshot();
    return snap?.data[symbol.toUpperCase()] ?? null;
}
