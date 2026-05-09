// ─── Crypto Signal Detection Engine ──────────────────────────────────
// Scrapes crypto subreddits + Twitter/X accounts, extracts token
// mentions, scores by velocity + volume. Stores signals to Supabase.
// ─────────────────────────────────────────────────────────────────────

import { createAdminClient } from '@/utils/supabase/admin';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execPromise = promisify(exec);

// ─── Config ──────────────────────────────────────────────────────────

const CRYPTO_SUBREDDITS = [
    'CryptoMoonShots',
    'SatoshiStreetBets',
    'memecoin',
    'solana',
    'ethereum',
    'altcoin',
    'CryptoCurrency',
];

// Minimum mentions in the window to fire a signal
const MIN_MENTIONS = 2;
// Velocity ratio to consider a surge (mentions now vs baseline)
const MIN_VELOCITY = 1.5;
// Ignore these common words that look like tickers
const IGNORE_TICKERS = new Set([
    'USD', 'ETH', 'BTC', 'SOL', 'BNB', 'USDT', 'USDC', 'DAI', 'NFT',
    'DeFi', 'DAO', 'APY', 'TVL', 'ATH', 'ATL', 'ROI', 'P2P', 'DEX',
    'CEX', 'ICO', 'IDO', 'IEO', 'IPO', 'AMA', 'KYC', 'API', 'GPU',
    'AI', 'VPN', 'TPS', 'EVM', 'ERC', 'BEP', 'SPL', 'MEV', 'RPC',
    'FOMO', 'FUD', 'HODL', 'DYOR', 'NFA', 'IMO', 'AFAIK', 'IYKYK',
    'USA', 'UK', 'EU', 'SEC', 'CFTC', 'FED', 'CPI', 'GDP',
    'NEW', 'GET', 'TOP', 'ALL', 'FOR', 'NOT', 'ARE', 'NOW',
]);

// ─── Types ───────────────────────────────────────────────────────────

export interface CryptoSignal {
    id: string;
    tokenSymbol: string;
    tokenName: string | null;
    chain: string;
    contractAddress: string | null;
    signalType: 'social_surge' | 'volume_spike' | 'combined';
    socialScore: number;
    mentionCount: number;
    mentionVelocity: number;
    priceUsd: number | null;
    volume24h: number | null;
    volumeChangePct: number | null;
    marketCap: number | null;
    priceChange1h: number | null;
    priceChange24h: number | null;
    topPosts: { title: string; url: string; score: number }[];
    dexUrl: string | null;
    firstDetectedAt: string;
    isLocked?: boolean; // true for free users if signal is <6h old
}

// ─── Twitter/X Scraper ───────────────────────────────────────────────

async function fetchCryptoTweets(): Promise<RedditPost[]> {
    try {
        const authToken = process.env.TWITTER_AUTH_TOKEN;
        const ct0 = process.env.TWITTER_CT0;
        if (!authToken || !ct0) return [];

        const pythonBin = process.env.PYTHON_BIN || '/usr/bin/python3';
        const script = path.join(process.cwd(), 'scripts/twikit_bridge.py');

        const payload = JSON.stringify({
            action: 'fetch_crypto',
            count: 10,
            cookies: { auth_token: authToken, ct0 },
        });

        const { stdout } = await execPromise(
            `echo '${payload.replace(/'/g, "'\\''")}' | "${pythonBin}" "${script}"`,
            { timeout: 55000 }
        );

        const data = JSON.parse(stdout);
        if (!data.success || !data.tweets) return [];

        // Map to RedditPost shape so existing pipeline handles both sources
        return data.tweets.map((t: any) => ({
            title: t.text,
            body: '',
            url: t.url,
            score: (t.likeCount || 0) + (t.retweetCount || 0) * 2,
            subreddit: `@${t.authorHandle}`,
            createdAt: t.createdAt ? Math.floor(new Date(t.createdAt).getTime() / 1000) : Math.floor(Date.now() / 1000),
        }));
    } catch (e) {
        console.error('[CryptoSignals] Twitter fetch failed:', (e as any).message?.slice(0, 100));
        return [];
    }
}

// ─── Reddit Scraper ───────────────────────────────────────────────────

interface RedditPost {
    title: string;
    body: string;
    url: string;
    score: number;
    subreddit: string;
    createdAt: number;
}

interface FetchedPosts {
    recent: RedditPost[];  // from /new — actual fresh posts
    baseline: RedditPost[]; // from /hot — popularity baseline
}

async function fetchCryptoRedditPosts(): Promise<FetchedPosts> {
    const recent: RedditPost[] = [];
    const baseline: RedditPost[] = [];
    const seenRecent = new Set<string>();
    const seenBaseline = new Set<string>();

    const fetchSub = async (url: string) => {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Staqq/1.0 (crypto signal detection; contact@staqq.com)' },
            cache: 'no-store',
        });
        return res;
    };

    // Fetch new (signal) and hot (baseline) separately
    const newResults = await Promise.allSettled(
        CRYPTO_SUBREDDITS.map(sub =>
            fetchSub(`https://www.reddit.com/r/${sub}/new.json?limit=50`)
        )
    );
    const hotResults = await Promise.allSettled(
        CRYPTO_SUBREDDITS.map(sub =>
            fetchSub(`https://www.reddit.com/r/${sub}/hot.json?limit=50`)
        )
    );


    // Need to await properly — parse synchronously
    const parseSync = async (results: PromiseSettledResult<Response>[], arr: RedditPost[], seen: Set<string>) => {
        for (const result of results) {
            if (result.status !== 'fulfilled') continue;
            const res = result.value;
            if (!res.ok) continue;
            const data = await res.json().catch(() => null);
            if (!data?.data?.children) continue;
            for (const child of data.data.children) {
                const post = child.data;
                if (post.stickied || seen.has(post.id)) continue;
                seen.add(post.id);
                arr.push({
                    title: post.title || '',
                    body: post.selftext || '',
                    url: `https://reddit.com${post.permalink}`,
                    score: post.score || 0,
                    subreddit: post.subreddit || '',
                    createdAt: post.created_utc || 0,
                });
            }
        }
    };

    await Promise.all([
        parseSync(newResults, recent, seenRecent),
        parseSync(hotResults, baseline, seenBaseline),
    ]);

    return { recent, baseline };
}

// ─── Token Extraction ─────────────────────────────────────────────────

function extractCryptoTickers(text: string): string[] {
    const tickers = new Set<string>();

    // $TICKER pattern (most reliable in crypto)
    const dollarPattern = /\$([A-Z]{2,10})\b/g;
    let match;
    while ((match = dollarPattern.exec(text)) !== null) {
        const t = match[1];
        if (!IGNORE_TICKERS.has(t)) tickers.add(t);
    }

    // ALL-CAPS 3-6 letter words (less reliable, only if post is crypto-focused)
    const capsPattern = /\b([A-Z]{3,6})\b/g;
    while ((match = capsPattern.exec(text)) !== null) {
        const t = match[1];
        if (!IGNORE_TICKERS.has(t) && !tickers.has(t)) {
            // Only add if it looks like a ticker context
            const context = text.slice(Math.max(0, match.index - 20), match.index + 20);
            if (/\d+x|\d+%|moon|pump|gem|launch|presale|buy|sell|hodl/i.test(context)) {
                tickers.add(t);
            }
        }
    }

    return Array.from(tickers);
}

// ─── DexScreener Enrichment ───────────────────────────────────────────

interface DexData {
    name: string;
    symbol: string;
    chain: string;
    address: string;
    priceUsd: number;
    volume24h: number;
    volumeChange: number;
    marketCap: number;
    priceChange1h: number;
    priceChange24h: number;
    dexUrl: string;
}

async function fetchDexScreenerData(ticker: string): Promise<DexData | null> {
    try {
        const res = await fetch(
            `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(ticker)}`,
            { cache: 'no-store' }
        );
        if (!res.ok) return null;

        const data = await res.json();
        const pairs: any[] = data.pairs || [];
        if (pairs.length === 0) return null;

        // Find best match: exact symbol match, highest liquidity
        const exactMatches = pairs.filter(
            p => p.baseToken?.symbol?.toUpperCase() === ticker.toUpperCase()
        );
        const best = exactMatches.length > 0
            ? exactMatches.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0]
            : pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];

        if (!best) return null;

        return {
            name: best.baseToken?.name || ticker,
            symbol: best.baseToken?.symbol || ticker,
            chain: best.chainId || 'unknown',
            address: best.baseToken?.address || '',
            priceUsd: parseFloat(best.priceUsd || '0'),
            volume24h: best.volume?.h24 || 0,
            volumeChange: best.volume?.h6 ? ((best.volume.h1 - best.volume.h6 / 6) / (best.volume.h6 / 6)) * 100 : 0,
            marketCap: best.marketCap || best.fdv || 0,
            priceChange1h: best.priceChange?.h1 || 0,
            priceChange24h: best.priceChange?.h24 || 0,
            dexUrl: best.url || `https://dexscreener.com/search?q=${ticker}`,
        };
    } catch {
        return null;
    }
}

// ─── Signal Detection ─────────────────────────────────────────────────

async function fetchDexScreenerTrending(): Promise<Omit<CryptoSignal, 'id' | 'isLocked'>[]> {
    try {
        const res = await fetch('https://api.dexscreener.com/token-boosts/top/v1', { cache: 'no-store' });
        if (!res.ok) return [];
        const boosts: any[] = await res.json();
        const top = (boosts || []).slice(0, 6);

        // Look up actual token info for each
        const results = await Promise.allSettled(
            top.map(async (item: any) => {
                const dex = await fetchDexScreenerData(item.tokenAddress);
                if (!dex || !dex.symbol) return null;
                return {
                    tokenSymbol: dex.symbol.toUpperCase(),
                    tokenName: dex.name,
                    chain: item.chainId || 'unknown',
                    contractAddress: item.tokenAddress,
                    signalType: 'volume_spike' as const,
                    socialScore: Math.min(55, Math.round((item.totalAmount || 0) / 50)),
                    mentionCount: 0,
                    mentionVelocity: 0,
                    priceUsd: dex.priceUsd,
                    volume24h: dex.volume24h,
                    volumeChangePct: dex.volumeChange,
                    marketCap: dex.marketCap,
                    priceChange1h: dex.priceChange1h,
                    priceChange24h: dex.priceChange24h,
                    topPosts: [],
                    dexUrl: item.url || dex.dexUrl,
                    firstDetectedAt: new Date().toISOString(),
                } as Omit<CryptoSignal, 'id' | 'isLocked'>;
            })
        );

        return results
            .filter(r => r.status === 'fulfilled' && r.value !== null)
            .map(r => (r as any).value);
    } catch {
        return [];
    }
}

async function detectSignals(): Promise<Omit<CryptoSignal, 'id' | 'isLocked'>[]> {
    const [{ recent, baseline }, twitterPosts] = await Promise.all([
        fetchCryptoRedditPosts(),
        fetchCryptoTweets(),
    ]);

    // Merge Twitter posts into recent (tweets are always fresh)
    recent.push(...twitterPosts);

    // recent = /new posts (fresh signal), baseline = /hot posts (background noise)
    const recentMentions: Record<string, { count: number; posts: RedditPost[] }> = {};
    const baselineMentions: Record<string, number> = {};

    const now = Date.now() / 1000;
    const maxAgeSeconds = 24 * 60 * 60; // only posts from last 24h

    for (const post of recent) {
        // Skip posts older than 24 hours
        if (now - post.createdAt > maxAgeSeconds) continue;
        const tickers = extractCryptoTickers(post.title + ' ' + post.body);
        for (const ticker of tickers) {
            if (!recentMentions[ticker]) recentMentions[ticker] = { count: 0, posts: [] };
            recentMentions[ticker].count++;
            recentMentions[ticker].posts.push(post);
        }
    }

    for (const post of baseline) {
        const tickers = extractCryptoTickers(post.title + ' ' + post.body);
        for (const ticker of tickers) {
            baselineMentions[ticker] = (baselineMentions[ticker] || 0) + 1;
        }
    }

    // Score each ticker by velocity: recent mentions vs hot baseline
    const candidates: Array<{ ticker: string; mentions: number; velocity: number; posts: RedditPost[] }> = [];

    for (const [ticker, data] of Object.entries(recentMentions)) {
        if (data.count < MIN_MENTIONS) continue;

        const baseline = baselineMentions[ticker] || 0.5;
        const velocity = data.count / baseline;

        if (velocity >= MIN_VELOCITY) {
            candidates.push({
                ticker,
                mentions: data.count,
                velocity,
                posts: data.posts.sort((a, b) => b.createdAt - a.createdAt).slice(0, 3),
            });
        }
    }

    // Sort by velocity desc, enrich top candidates with DexScreener
    candidates.sort((a, b) => b.velocity - a.velocity);
    const top = candidates.slice(0, 20);

    const signals: Omit<CryptoSignal, 'id' | 'isLocked'>[] = [];

    await Promise.allSettled(
        top.map(async (candidate) => {
            const dex = await fetchDexScreenerData(candidate.ticker);

            // Calculate social score (0-100)
            const velocityScore = Math.min(40, (candidate.velocity / 10) * 40);
            const mentionScore = Math.min(30, (candidate.mentions / 20) * 30);
            const volumeScore = dex && dex.volumeChange > 50
                ? Math.min(30, (dex.volumeChange / 200) * 30)
                : 0;
            const socialScore = Math.round(velocityScore + mentionScore + volumeScore);

            let signalType: CryptoSignal['signalType'] = 'social_surge';
            if (dex && dex.volumeChange > 20 && candidate.velocity >= MIN_VELOCITY) {
                signalType = 'combined';
            } else if (dex && dex.volumeChange > 20) {
                signalType = 'volume_spike';
            }

            signals.push({
                tokenSymbol: candidate.ticker,
                tokenName: dex?.name || null,
                chain: dex?.chain || 'unknown',
                contractAddress: dex?.address || null,
                signalType,
                socialScore,
                mentionCount: candidate.mentions,
                mentionVelocity: Math.round(candidate.velocity * 10) / 10,
                priceUsd: dex?.priceUsd || null,
                volume24h: dex?.volume24h || null,
                volumeChangePct: dex?.volumeChange || null,
                marketCap: dex?.marketCap || null,
                priceChange1h: dex?.priceChange1h || null,
                priceChange24h: dex?.priceChange24h || null,
                topPosts: candidate.posts.map(p => ({ title: p.title, url: p.url, score: p.score })),
                dexUrl: dex?.dexUrl || null,
                firstDetectedAt: new Date().toISOString(),
            });
        })
    );

    // Supplement with DexScreener trending if Reddit signals are thin
    if (signals.length < 5) {
        const trending = await fetchDexScreenerTrending();
        const existingSymbols = new Set(signals.map(s => s.tokenSymbol));
        for (const t of trending) {
            if (!existingSymbols.has(t.tokenSymbol)) {
                signals.push(t);
            }
        }
    }

    return signals.sort((a, b) => b.socialScore - a.socialScore);
}

// ─── Supabase Persistence ─────────────────────────────────────────────

async function storeSignals(signals: Omit<CryptoSignal, 'id' | 'isLocked'>[]): Promise<void> {
    if (signals.length === 0) return;
    const supabase = createAdminClient();
    if (!supabase) return;

    for (const signal of signals) {
        const detectedAt = new Date(signal.firstDetectedAt);
        // signal_hour as "YYYY-MM-DD HH" — immutable string, safe for unique index
        const signalHour = `${detectedAt.getUTCFullYear()}-${String(detectedAt.getUTCMonth() + 1).padStart(2, '0')}-${String(detectedAt.getUTCDate()).padStart(2, '0')} ${String(detectedAt.getUTCHours()).padStart(2, '0')}`;

        await supabase.from('crypto_signals').upsert({
            token_symbol: signal.tokenSymbol,
            token_name: signal.tokenName,
            chain: signal.chain,
            contract_address: signal.contractAddress,
            signal_type: signal.signalType,
            social_score: signal.socialScore,
            mention_count: signal.mentionCount,
            mention_velocity: signal.mentionVelocity,
            price_usd: signal.priceUsd,
            volume_24h: signal.volume24h,
            volume_change_pct: signal.volumeChangePct,
            market_cap: signal.marketCap,
            price_change_1h: signal.priceChange1h,
            price_change_24h: signal.priceChange24h,
            top_posts: signal.topPosts,
            dex_url: signal.dexUrl,
            signal_hour: signalHour,
            first_detected_at: signal.firstDetectedAt,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'token_symbol,signal_hour',
            ignoreDuplicates: true,
        });
    }
}


// ─── Public API ───────────────────────────────────────────────────────

/**
 * Detect new signals, store them, then return the full feed.
 * isPro: if false, signals < 6h old are locked (delay wall).
 */
export async function getCryptoSignals(isPro: boolean = false): Promise<CryptoSignal[]> {
    // Always detect fresh signals — this is the primary source
    const freshSignals = await detectSignals();

    // Store to Supabase in background (for history/delay wall enforcement)
    storeSignals(freshSignals).catch(console.error);

    // Deduplicate by tokenSymbol, keep highest score
    const seen = new Map<string, Omit<CryptoSignal, 'id' | 'isLocked'>>();
    for (const s of freshSignals) {
        const existing = seen.get(s.tokenSymbol);
        if (!existing || s.socialScore > existing.socialScore) {
            seen.set(s.tokenSymbol, s);
        }
    }

    const deduped = Array.from(seen.values()).sort((a, b) => b.socialScore - a.socialScore);
    const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

    return deduped.map((s, i) => ({
        ...s,
        id: `live-${i}`,
        isLocked: !isPro && s.firstDetectedAt > cutoff,
    }));
}
