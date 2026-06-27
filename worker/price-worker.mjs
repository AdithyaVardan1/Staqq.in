// ─── Staqq price worker ──────────────────────────────────────────────
// A single long-lived process (runs on the VPS under systemd) that:
//   1. logs into Angel One ONCE and holds the session,
//   2. every REFRESH_MS fetches live prices for the whole NIFTY 500 universe
//      (50 tokens/call, spaced to Angel One's 1 req/sec limit),
//   3. writes ONE snapshot to Upstash Redis — the exact key the Vercel app reads.
//
// This is the "cook stocking the fridge": Vercel only ever reads the snapshot,
// so the stock pages never depend on Angel One being reachable at request time.
//
// Run:  node --env-file=worker/.env worker/price-worker.mjs
// Test: RUN_ONCE=1 node --env-file=worker/.env worker/price-worker.mjs
//
// Reuses the main repo's node_modules (smartapi-javascript, otplib,
// @upstash/redis) — no separate install needed.

import smartapiPkg from 'smartapi-javascript';
import { generateSync } from 'otplib';
import { Redis } from '@upstash/redis';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const { SmartAPI } = smartapiPkg;
const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────────────
const {
    ANGEL_ONE_API_KEY,
    ANGEL_ONE_CLIENT_CODE,
    ANGEL_ONE_PASSWORD,
    ANGEL_ONE_TOTP_SECRET,
    UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN,
} = process.env;

const REFRESH_MS = Number(process.env.REFRESH_MS || 30_000);          // market hours
const REFRESH_MS_CLOSED = Number(process.env.REFRESH_MS_CLOSED || 600_000); // off-hours (10 min)
const SNAPSHOT_KEY = 'stocks:snapshot';
const SNAPSHOT_TTL = 6 * 60 * 60; // seconds
const INSTRUMENT_URL = 'https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json';
const RUN_ONCE = process.env.RUN_ONCE === '1';

const universe = JSON.parse(readFileSync(join(__dirname, '../src/data/nifty500.json'), 'utf8'));

const redis = (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN)
    ? new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN, automaticDeserialization: false })
    : null;

const smart = new SmartAPI({ api_key: ANGEL_ONE_API_KEY });
let tokenMap = null;       // symbol -> token string
let tokensLoadedAt = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString(), ...a);

// ── Market hours (NSE: 09:15–15:30 IST, Mon–Fri) ────────────────────
function isMarketOpen() {
    const now = new Date();
    // IST = UTC + 5:30
    const ist = new Date(now.getTime() + (5.5 * 60 - now.getTimezoneOffset()) * 60_000);
    const day = ist.getDay();
    if (day === 0 || day === 6) return false;
    const mins = ist.getHours() * 60 + ist.getMinutes();
    return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
}

// ── Angel One auth ──────────────────────────────────────────────────
async function login() {
    const totp = generateSync({ secret: ANGEL_ONE_TOTP_SECRET, algorithm: 'sha1', digits: 6, period: 30 });
    const res = await smart.generateSession(ANGEL_ONE_CLIENT_CODE, ANGEL_ONE_PASSWORD, totp);
    if (!res?.status) throw new Error(`Angel One login failed: ${res?.message || 'unknown'}`);
    log('[worker] Angel One authenticated');
}

// ── Instrument master -> symbol:token map (refreshed daily) ─────────
async function loadTokens() {
    if (tokenMap && Date.now() - tokensLoadedAt < 24 * 60 * 60 * 1000) return;
    const res = await fetch(INSTRUMENT_URL);
    const data = await res.json();
    const map = new Map();
    for (const item of data) {
        if (item.exch_seg === 'NSE') map.set(item.symbol, item.token);
    }
    tokenMap = map;
    tokensLoadedAt = Date.now();
    log(`[worker] Instrument master loaded (${map.size} NSE symbols)`);
}

// ── One full refresh of the universe ────────────────────────────────
async function refreshOnce() {
    await loadTokens();

    // Build 50-token groups for the universe
    const groups = [];
    let cur = { tokens: [], map: {} };
    for (const c of universe) {
        const token = tokenMap.get(`${c.symbol}-EQ`);
        if (!token) continue;
        cur.tokens.push(String(token));
        cur.map[String(token)] = c.symbol;
        if (cur.tokens.length === 50) { groups.push(cur); cur = { tokens: [], map: {} }; }
    }
    if (cur.tokens.length) groups.push(cur);

    const data = {};
    for (let i = 0; i < groups.length; i++) {
        try {
            const res = await smart.marketData({ mode: 'FULL', exchangeTokens: { NSE: groups[i].tokens } });
            const fetched = res?.data?.fetched || [];
            for (const item of fetched) {
                const sym = groups[i].map[String(item.symbolToken)];
                if (!sym) continue;
                const ltp = parseFloat(item.ltp || '0');
                if (ltp > 0) {
                    data[sym] = {
                        price: ltp,
                        change: parseFloat(item.percentChange || '0'),
                        changeAmount: parseFloat(item.netChange || '0'),
                        high52: parseFloat(item['52WeekHigh'] || '0'),
                        low52: parseFloat(item['52WeekLow'] || '0'),
                    };
                }
            }
        } catch (err) {
            log(`[worker] batch ${i} error:`, err.message);
            if (/401|unauthor/i.test(err.message)) { await login(); }
        }
        if (i < groups.length - 1) await sleep(1100); // respect 1 req/sec
    }

    const snapshot = { updatedAt: Date.now(), data };
    if (redis) {
        await redis.set(SNAPSHOT_KEY, JSON.stringify(snapshot), { ex: SNAPSHOT_TTL });
        log(`[worker] wrote snapshot: ${Object.keys(data).length}/${universe.length} priced`);
    } else {
        log(`[worker] DRY RUN (no Upstash creds): ${Object.keys(data).length}/${universe.length} priced`);
    }
    return Object.keys(data).length;
}

// ── Main loop ───────────────────────────────────────────────────────
async function main() {
    await login();

    if (RUN_ONCE) { await refreshOnce(); process.exit(0); }

    // Re-login daily (Angel JWTs last ~24h)
    setInterval(() => login().catch((e) => log('[worker] re-login failed:', e.message)), 18 * 60 * 60 * 1000);

    for (;;) {
        try { await refreshOnce(); }
        catch (err) { log('[worker] refresh error:', err.message); }
        await sleep(isMarketOpen() ? REFRESH_MS : REFRESH_MS_CLOSED);
    }
}

main().catch((err) => { log('[worker] fatal:', err.message); process.exit(1); });
