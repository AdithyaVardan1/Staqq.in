import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import Parser from 'rss-parser';
import { createAdminClient } from '@/utils/supabase/admin';

export interface SocialPost {
    id: string;
    title: string;
    body: string;
    url: string;
    score: number;
    comments: number;
    source: 'news' | 'twitter' | 'reddit';
    community: string;
    author: string | null;
    createdAt: number;
    tickers: string[];
    isHot: boolean;
    image?: string;
}

export interface MarketPulse {
    id: string;
    date: string;
    ticker: string | null;
    source: 'reddit' | 'news';
    headline: string;
    summary: string;
    sentiment: 'bullish' | 'bearish' | 'neutral' | 'mixed';
    sentimentScore: number;
    postCount: number;
    topics: string[];
    createdAt: string;
}

// ─── RSS News Feeds ───────────────────────────────────────────────────

const NEWS_FEEDS = [
    { url: 'https://www.livemint.com/rss/markets',                            label: 'LiveMint' },
    { url: 'https://www.thehindubusinessline.com/markets/feeder/default.rss', label: 'BusinessLine' },
];


function truncateBody(text: string, maxLen = 300): string {
    if (!text || text.length <= maxLen) return text || '';
    return text.slice(0, maxLen) + '...';
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function parsePubDate(dateStr: string | undefined): number {
    if (!dateStr) return NaN;
    const parts = dateStr.split(',');
    let cleanStr = parts.length > 1 ? parts.slice(1).join(',').trim() : dateStr.trim();
    cleanStr = cleanStr
        .replace(/Oca/i, 'Jan')
        .replace(/Şub/i, 'Feb')
        .replace(/Mar/i, 'Mar')
        .replace(/Nis/i, 'Apr')
        .replace(/May/i, 'May')
        .replace(/Haz/i, 'Jun')
        .replace(/Tem/i, 'Jul')
        .replace(/Ağu/i, 'Aug')
        .replace(/Eyl/i, 'Sep')
        .replace(/Eki/i, 'Oct')
        .replace(/Kas/i, 'Nov')
        .replace(/Ara/i, 'Dec');
    return new Date(cleanStr).getTime();
}

// ─── News Feed Fetching ───────────────────────────────────────────────

async function fetchNewsFeedPosts(): Promise<SocialPost[]> {
    const parser = new Parser({ timeout: 8000 });
    const posts: SocialPost[] = [];
    const seenIds = new Set<string>();

    const results = await Promise.allSettled(
        NEWS_FEEDS.map(({ url, label }) =>
            parser.parseURL(url).then(feed => ({ label, items: feed.items }))
        )
    );

    for (const result of results) {
        if (result.status !== 'fulfilled') {
            console.error('[News] Feed failed:', (result as any).reason?.message);
            continue;
        }
        const { label, items } = result.value;

        for (const item of items) {
            const id = `news-${label}-${item.guid || item.link}`;
            if (seenIds.has(id)) continue;
            seenIds.add(id);

            const title = stripHtml(item.title || '');
            const body = truncateBody(stripHtml(item.contentSnippet || item.content || item.summary || ''));
            if (!title) continue;

            const parsedTime = parsePubDate(item.pubDate);
            const createdAt = !isNaN(parsedTime)
                ? Math.floor(parsedTime / 1000)
                : Math.floor(Date.now() / 1000);

            const mediaItem = item as any;
            const image: string | undefined =
                mediaItem['media:content']?.['$']?.url ||
                mediaItem.enclosure?.url ||
                undefined;

            posts.push({
                id,
                title,
                body,
                url: item.link || '',
                score: 0,
                comments: 0,
                source: 'news',
                community: label,
                author: item.creator || null,
                createdAt,
                tickers: [],
                isHot: false,
                image,
            });
        }
    }

    console.log(`[News] Fetched ${posts.length} articles from ${NEWS_FEEDS.length} feeds`);
    return posts;
}

// ─── Twitter/X (Supabase-backed) ─────────────────────────────────────
// fetch_tweets.py writes to the `tweets` Supabase table.

async function loadTwitterPosts(): Promise<SocialPost[]> {
    try {
        const supabase = createAdminClient();
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('tweets')
            .select('post_id, title, body, url, score, comments, community, author, created_at_ts, tickers, is_hot, image')
            .gte('created_at_ts', Math.floor(Date.now() / 1000) - 86400)
            .order('created_at_ts', { ascending: false })
            .limit(100);

        if (!error && data && data.length > 0) {
            console.log(`[Twitter] Loaded ${data.length} tweets from Supabase`);
            return data.map((t: any) => ({
                id: t.post_id,
                title: t.title || '',
                body: t.body || '',
                url: t.url || '',
                score: t.score || 0,
                comments: t.comments || 0,
                source: 'twitter' as const,
                community: t.community || 'X / Twitter',
                author: t.author || null,
                createdAt: t.created_at_ts || 0,
                tickers: t.tickers || [],
                isHot: t.is_hot || false,
                image: t.image || undefined,
            }));
        }
    } catch (err) {
        console.error('[Twitter] Supabase read error:', err);
    }

    // Local fallback for dev
    try {
        const tweetsPath = join(process.cwd(), 'data', 'tweets.json');
        if (!existsSync(tweetsPath)) return [];
        const raw = readFileSync(tweetsPath, 'utf-8');
        const data = JSON.parse(raw);
        const posts: SocialPost[] = (data.posts || []).map((p: any) => ({
            id: p.id || '',
            title: p.title || '',
            body: p.body || '',
            url: p.url || '',
            score: p.score || 0,
            comments: p.comments || 0,
            source: 'twitter' as const,
            community: p.community || 'X / Twitter',
            author: p.author || null,
            createdAt: p.createdAt || 0,
            tickers: p.tickers || [],
            isHot: p.isHot || false,
            image: p.image || undefined,
        }));
        console.log(`[Twitter] Loaded ${posts.length} tweets from local JSON`);
        return posts;
    } catch {
        return [];
    }
}

// ─── Market Pulse (AI summaries) ─────────────────────────────────────
// summarize_reddit.py  — Reddit discussions → Groq → source='reddit'
// summarize_news.py    — RSS articles → Groq      → source='news'
// Both write to `market_pulse`. Raw source content never hits the frontend.

// Only the columns rowToPulse reads — the table also stores raw source content
// (full Reddit threads / article text) that must never be shipped to the client.
const PULSE_COLS = 'id, date, ticker, source, headline, summary, sentiment, sentiment_score, post_count, topics, created_at';

function rowToPulse(row: any): MarketPulse {
    return {
        id:            row.id,
        date:          row.date,
        ticker:        row.ticker ?? null,
        source:        row.source ?? 'reddit',
        headline:      row.headline,
        summary:       row.summary,
        sentiment:     row.sentiment,
        sentimentScore: row.sentiment_score,
        postCount:     row.post_count,
        topics:        row.topics || [],
        createdAt:     row.created_at,
    };
}

export async function getMarketPulse(limit = 20): Promise<MarketPulse[]> {
    try {
        const supabase = createAdminClient();
        if (!supabase) return [];
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('market_pulse')
            .select(PULSE_COLS)
            .gte('date', sevenDaysAgo)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        if (!data || data.length === 0) return [];

        console.log(`[MarketPulse] Loaded ${data.length} pulse summaries`);
        return data.map(rowToPulse);
    } catch (err) {
        console.error('[MarketPulse] Failed to load:', err);
        return [];
    }
}

export async function getSocialPulses(limit = 8): Promise<MarketPulse[]> {
    try {
        const supabase = createAdminClient();
        if (!supabase) return [];
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString().split('T')[0];

        const { data } = await supabase
            .from('market_pulse')
            .select(PULSE_COLS)
            .eq('source', 'reddit')
            .gte('date', sevenDaysAgo)
            .order('created_at', { ascending: false })
            .limit(limit);

        return (data || []).map(rowToPulse);
    } catch {
        return [];
    }
}

export async function getNewsPulses(limit = 8): Promise<MarketPulse[]> {
    try {
        const supabase = createAdminClient();
        if (!supabase) return [];

        const { data } = await supabase
            .from('market_pulse')
            .select(PULSE_COLS)
            .eq('source', 'news')
            .order('created_at', { ascending: false })
            .limit(limit);

        return (data || []).map(rowToPulse);
    } catch {
        return [];
    }
}

// ─── Public API ───────────────────────────────────────────────────────

export async function getAllPosts(limit?: number): Promise<SocialPost[]> {
    const posts = await fetchNewsFeedPosts();
    const cutoff = Math.floor(Date.now() / 1000) - 23 * 60 * 60; // 23 hours ago
    const sorted = posts
        .filter(p => p.createdAt >= cutoff)
        .sort((a, b) => b.createdAt - a.createdAt);
    const result = limit ? sorted.slice(0, limit) : sorted;
    console.log(`[Pulse] ${result.length} news posts (within 23h)`);
    return result;
}

export async function getNewsPosts(): Promise<SocialPost[]> {
    return fetchNewsFeedPosts();
}

export async function getTwitterPosts(): Promise<SocialPost[]> {
    return loadTwitterPosts();
}

export async function getTrendingTickers(limit = 20): Promise<string[]> {
    const pulses = await getMarketPulse(50);
    const tickerCounts: Record<string, number> = {};
    for (const pulse of pulses) {
        if (pulse.ticker) {
            tickerCounts[pulse.ticker] = (tickerCounts[pulse.ticker] || 0) + pulse.postCount;
        }
    }
    return Object.entries(tickerCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([ticker]) => ticker)
        .slice(0, limit);
}
