import { SmartAPI } from 'smartapi-javascript';
import { generateSync } from 'otplib';
import { redis } from './redis';

const API_KEY = process.env.ANGEL_ONE_API_KEY!;
const CLIENT_CODE = process.env.ANGEL_ONE_CLIENT_CODE!;
const PASSWORD = process.env.ANGEL_ONE_PASSWORD!;
const TOTP_SECRET = process.env.ANGEL_ONE_TOTP_SECRET!;

// Redis key for shared session (all serverless instances share this)
const SESSION_KEY = 'angelone:session';
const SESSION_TTL = 82800; // 23 hours (Angel One JWTs last ~24h)

// Instrument master list cache — use /tmp so it survives across warm invocations
const CACHE_FILE = `${process.env.VERCEL ? '/tmp' : process.cwd()}/angelone_tokens.json`;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export interface MarketQuote {
    ltp: number;
    netChange: number;
    percentChange: number;
    close: number;
    high: number;
    low: number;
    open: number;
    volume: number;
    week52High: number;
    week52Low: number;
}

export class AngelOneService {
    private static instance: AngelOneService;
    private smartApi: any;
    private sessionData: any = null;
    private tokensCache: Map<string, any> | null = null;
    private lastFetchTime: number = 0;

    // Prevent concurrent re-auth (thundering herd)
    private authInProgress: Promise<boolean> | null = null;

    private constructor() {
        this.smartApi = new SmartAPI({ api_key: API_KEY });
    }

    public static getInstance(): AngelOneService {
        if (!AngelOneService.instance) {
            AngelOneService.instance = new AngelOneService();
        }
        return AngelOneService.instance;
    }

    // ── Session Management ──────────────────────────────────────────────

    /**
     * Ensures a valid session exists. Checks Redis first to share across all
     * serverless instances, then re-authenticates only if needed.
     * Protected against concurrent calls — only one auth happens at a time.
     */
    public async ensureSession(): Promise<boolean> {
        // In-memory session still valid (warm invocation)
        if (this.sessionData) return true;

        // Check Redis (another instance may have already authenticated)
        const cached = await redis.get(SESSION_KEY);
        if (cached) {
            try {
                this.sessionData = JSON.parse(cached);
                return true;
            } catch { /* invalid JSON, fall through */ }
        }

        // Only one concurrent auth allowed
        if (!this.authInProgress) {
            this.authInProgress = this._doAuth().finally(() => {
                this.authInProgress = null;
            });
        }
        return this.authInProgress;
    }

    private async _doAuth(): Promise<boolean> {
        try {
            if (!TOTP_SECRET) throw new Error('ANGEL_ONE_TOTP_SECRET missing');
            const token = generateSync({ secret: TOTP_SECRET, algorithm: 'sha1', digits: 6, period: 30 });
            const response = await this.smartApi.generateSession(CLIENT_CODE, PASSWORD, token);
            if (!response.status) throw new Error(response.message || 'Auth failed');

            this.sessionData = response.data;
            await redis.set(SESSION_KEY, JSON.stringify(response.data), SESSION_TTL);
            console.log('[AngelOne] Authenticated and session stored in Redis');
            return true;
        } catch (err: any) {
            console.error('[AngelOne] Auth failed:', err.message);
            return false;
        }
    }

    /** Force re-authentication (call when a request returns 401) */
    public async refreshSession(): Promise<boolean> {
        this.sessionData = null;
        await redis.del(SESSION_KEY);
        return this.ensureSession();
    }

    public getSession() { return this.sessionData; }

    // ── Instrument Master List ──────────────────────────────────────────

    public async getInstrumentTokens(): Promise<Map<string, any>> {
        const now = Date.now();
        const fs = require('fs');
        const path = require('path');

        if (this.tokensCache && now - this.lastFetchTime < CACHE_DURATION) {
            return this.tokensCache;
        }

        if (fs.existsSync(CACHE_FILE)) {
            const stats = fs.statSync(CACHE_FILE);
            if (now - stats.mtimeMs < CACHE_DURATION) {
                try {
                    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
                    this._buildTokenMap(JSON.parse(raw));
                    this.lastFetchTime = stats.mtimeMs;
                    return this.tokensCache!;
                } catch { /* fall through to fetch */ }
            }
        }

        try {
            console.log('[AngelOne] Fetching fresh instrument master list...');
            const res = await fetch('https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json');
            const data = await res.json();
            fs.writeFileSync(CACHE_FILE, JSON.stringify(data));
            this._buildTokenMap(data);
            this.lastFetchTime = now;
        } catch (err) {
            console.error('[AngelOne] Failed to fetch master list:', err);
        }

        return this.tokensCache || new Map();
    }

    private _buildTokenMap(data: any[]) {
        const map = new Map<string, any>();
        data.forEach(item => map.set(`${item.exch_seg}:${item.symbol}`, item));
        this.tokensCache = map;
        console.log(`[AngelOne] Token map built: ${map.size} instruments`);
    }

    public async findInstrument(ticker: string) {
        const map = await this.getInstrumentTokens();
        const nseKey = `NSE:${ticker}-EQ`;
        if (map.has(nseKey)) {
            const i = map.get(nseKey);
            return { token: i.token, exchange: 'NSE', symbol: `${ticker}-EQ` };
        }
        const bseKey = `BSE:${ticker}`;
        if (map.has(bseKey)) {
            const i = map.get(bseKey);
            return { token: i.token, exchange: 'BSE', symbol: ticker };
        }
        const rawKey = `NSE:${ticker}`;
        if (map.has(rawKey)) {
            const i = map.get(rawKey);
            return { token: i.token, exchange: 'NSE', symbol: ticker };
        }
        return null;
    }

    public async findToken(ticker: string) {
        const instrument = await this.findInstrument(ticker);
        return instrument?.token || null;
    }

    public async searchInstruments(query: string) {
        await this.getInstrumentTokens();
        if (!this.tokensCache) return [];

        const term = query.toUpperCase();
        const results: any[] = [];

        for (const item of this.tokensCache.values()) {
            if (item.exch_seg !== 'NSE' && item.exch_seg !== 'BSE') continue;
            const cleanSymbol = item.symbol.replace('-EQ', '');
            const itemName = (item.name || '').toUpperCase();
            let score = 0;
            if (cleanSymbol === term) score = 100;
            else if (cleanSymbol.startsWith(term)) score = 80;
            else if (itemName.includes(term)) score = 50;
            if (score > 0) {
                results.push({ symbol: cleanSymbol, name: item.name, exchange: item.exch_seg, token: item.token, type: item.instrumenttype, score });
            }
            if (results.length > 500) break;
        }

        return results
            .sort((a, b) => b.score - a.score || a.symbol.length - b.symbol.length)
            .slice(0, 15)
            .map(({ score: _s, ...rest }) => rest);
    }

    // ── Market Data ─────────────────────────────────────────────────────

    /**
     * Batch fetch real-time quotes for up to 50 NSE tokens per call.
     * Uses Angel One marketData FULL mode — returns ltp, netChange, percentChange, volume.
     * tokenToTicker: Map from symbolToken -> ticker symbol for result mapping.
     */
    public async batchMarketData(
        nseTokens: string[],
        tokenToTicker: Record<string, string>
    ): Promise<Record<string, MarketQuote>> {
        const ok = await this.ensureSession();
        if (!ok) return {};

        const results: Record<string, MarketQuote> = {};
        const batchSize = 50;

        for (let i = 0; i < nseTokens.length; i += batchSize) {
            const batch = nseTokens.slice(i, i + batchSize);
            try {
                const response = await this.smartApi.marketData({
                    mode: 'FULL',
                    exchangeTokens: { NSE: batch }
                });

                if (response?.status && response.data?.fetched) {
                    for (const item of response.data.fetched) {
                        const ticker = tokenToTicker[String(item.symbolToken)];
                        if (!ticker) continue;
                        const close = parseFloat(item.close || '0');
                        const ltp = parseFloat(item.ltp || '0');
                        results[ticker] = {
                            ltp,
                            close,
                            netChange: parseFloat(item.netChange || String(ltp - close)),
                            percentChange: parseFloat(item.percentChange || String(close > 0 ? ((ltp - close) / close) * 100 : 0)),
                            high: parseFloat(item.high || '0'),
                            low: parseFloat(item.low || '0'),
                            open: parseFloat(item.open || '0'),
                            volume: parseInt(item.tradeVolume || '0', 10),
                            week52High: parseFloat(item['52WeekHigh'] || '0'),
                            week52Low: parseFloat(item['52WeekLow'] || '0'),
                        };
                    }
                }
            } catch (err: any) {
                // 401 = session expired, try refreshing once
                if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
                    const refreshed = await this.refreshSession();
                    if (refreshed) {
                        // Retry this batch
                        try {
                            const retry = await this.smartApi.marketData({
                                mode: 'FULL',
                                exchangeTokens: { NSE: batch }
                            });
                            if (retry?.status && retry.data?.fetched) {
                                for (const item of retry.data.fetched) {
                                    const ticker = tokenToTicker[String(item.symbolToken)];
                                    if (!ticker) continue;
                                    const close = parseFloat(item.close || '0');
                                    const ltp = parseFloat(item.ltp || '0');
                                    results[ticker] = {
                                        ltp, close,
                                        netChange: parseFloat(item.netChange || String(ltp - close)),
                                        percentChange: parseFloat(item.percentChange || '0'),
                                        high: parseFloat(item.high || '0'),
                                        low: parseFloat(item.low || '0'),
                                        open: parseFloat(item.open || '0'),
                                        volume: parseInt(item.tradeVolume || '0', 10),
                                        week52High: parseFloat(item['52WeekHigh'] || '0'),
                                        week52Low: parseFloat(item['52WeekLow'] || '0'),
                                    };
                                }
                            }
                        } catch { /* ignore retry failure */ }
                    }
                } else {
                    console.error(`[AngelOne] batchMarketData error batch ${i}:`, err.message);
                }
            }
        }

        return results;
    }

    /**
     * Single stock full quote via marketData.
     */
    public async getFullQuote(exchange: string, symbol: string, token: string) {
        const ok = await this.ensureSession();
        if (!ok) return null;
        try {
            const response = await this.smartApi.marketData({
                mode: 'FULL',
                exchangeTokens: { [exchange]: [token] }
            });
            if (response?.status && response.data?.fetched?.length > 0) {
                const data = response.data.fetched[0];
                const close = parseFloat(data.close || '0');
                const ltp = parseFloat(data.ltp || '0');
                return {
                    status: true,
                    data: [{
                        ltp,
                        netChange: parseFloat(data.netChange || String(ltp - close)),
                        percentChange: parseFloat(data.percentChange || String(close > 0 ? ((ltp - close) / close) * 100 : 0)),
                        exchange,
                        tradingsymbol: symbol
                    }]
                };
            }
            return response;
        } catch (err: any) {
            console.error('[AngelOne] getFullQuote error:', err.message);
            return null;
        }
    }

    public async getCandleData(exchange: string, token: string, interval: string, fromDate: string, toDate: string) {
        const ok = await this.ensureSession();
        if (!ok) return null;
        try {
            return await this.smartApi.getCandleData({ exchange, symboltoken: token, interval, fromdate: fromDate, todate: toDate });
        } catch (err: any) {
            console.error('[AngelOne] getCandleData error:', err.message);
            return null;
        }
    }

    public async getLTP(exchange: string, symbol: string, token: string) {
        const ok = await this.ensureSession();
        if (!ok) return null;
        try {
            return await this.smartApi.getLTPDetail({ exchange, tradingsymbol: symbol, symboltoken: token });
        } catch (err: any) {
            console.error('[AngelOne] getLTP error:', err.message);
            return null;
        }
    }

    public async getFundamentalData(exchange: string, token: string) {
        const ok = await this.ensureSession();
        if (!ok) return null;
        try {
            return await fetch('https://apiconnect.angelbroking.com/rest/auth/angelbroking/market/v1/getFundamental', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.sessionData.jwtToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-UserType': 'USER',
                    'X-SourceID': 'WEB',
                    'X-ClientLocalIP': '192.168.1.1',
                    'X-ClientPublicIP': '1.1.1.1',
                    'X-MACAddress': 'test',
                    'X-PrivateKey': API_KEY
                },
                body: JSON.stringify({ exchange, symboltoken: token })
            }).then(r => r.json());
        } catch (err: any) {
            console.error('[AngelOne] getFundamentalData error:', err.message);
            return null;
        }
    }

    public async getWebSocketV2() {
        const ok = await this.ensureSession();
        if (!ok) throw new Error('No valid Angel One session');
        const { WebSocketV2 } = require('smartapi-javascript');
        return new WebSocketV2({
            clientcode: CLIENT_CODE,
            jwttoken: this.sessionData.jwtToken,
            apikey: API_KEY,
            feedtype: this.sessionData.feedToken
        });
    }

    // Keep old authenticate() for the session API route (returns full data)
    public async authenticate() {
        const ok = await this._doAuth();
        if (ok && this.sessionData) return { success: true, data: this.sessionData };
        return { success: false, error: 'Authentication failed' };
    }
}

export const angelOne = AngelOneService.getInstance();
