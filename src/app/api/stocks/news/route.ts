import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { checkRateLimit } from '@/lib/rate-limiter';
import { cdnCache } from '@/lib/http-cache';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const NEWS_CDN_TTL = 15 * 60; // match the 15-min Redis TTL

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const ticker = searchParams.get('ticker');

        if (!ticker) {
            return NextResponse.json({ error: 'Ticker parameter required' }, { status: 400 });
        }

        // Rate Limit: 20 req/min for News
        const isAllowed = await checkRateLimit('news_api', 20, 60);
        if (!isAllowed) {
            return NextResponse.json({
                success: false,
                news: [],
                message: 'Too many requests. Please try again in a minute.'
            }, { status: 429 });
        }

        // 1. Check Redis Cache
        const cacheKey = `news_cache:${ticker.toUpperCase()}`;
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                console.log(`[News API] Cache Hit: ${ticker}`);
                return NextResponse.json(JSON.parse(cached), { headers: cdnCache(NEWS_CDN_TTL) });
            }
        } catch (e) {
            console.error('[News API] Redis check failed:', e);
        }

        console.log(`[News API] Fetching news for: ${ticker}`);

        // Call RapidAPI Share Market News API (India) with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout

        try {
            const response = await fetch('https://share-market-news-api-india.p.rapidapi.com/marketNews', {
                headers: {
                    'x-rapidapi-host': 'share-market-news-api-india.p.rapidapi.com',
                    'x-rapidapi-key': RAPIDAPI_KEY || ''
                },
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                console.warn(`[News API] RapidAPI returned ${response.status}: ${response.statusText}`);
                return NextResponse.json({
                    success: false,
                    news: [],
                    message: 'News API temporarily unavailable'
                });
            }

            const data = await response.json();
            const news = Array.isArray(data) ? data : data.news || [];

            // Format news items
            const formattedNews = news.slice(0, 10).map((item: any, idx: number) => ({
                id: item.id || `news-${idx}`,
                title: item.title || item.headline || '',
                source: item.source || 'Market News',
                link: item.url || item.link || '',
                date: item.publishedAt || item.date || new Date().toISOString(),
                description: item.description || item.summary || ''
            }));

            const finalResponse = {
                success: true,
                news: formattedNews,
                source: 'rapidapi'
            };

            // 2. Cache in Redis (15 mins TTL)
            try {
                await redis.set(cacheKey, JSON.stringify(finalResponse), 15 * 60);
            } catch (e) {
                console.error('[News API] Redis set failed:', e);
            }

            return NextResponse.json(finalResponse, { headers: cdnCache(NEWS_CDN_TTL) });

        } catch (fetchError: any) {
            clearTimeout(timeout);
            console.warn('[News API] Fetch error:', fetchError.message);
            return NextResponse.json({
                success: false,
                news: [],
                message: 'News API temporarily unavailable'
            });
        }
    } catch (error: any) {
        console.error('[News API] Error:', error);
        return NextResponse.json({
            success: false,
            news: [],
            message: 'News API temporarily unavailable'
        });
    }
}
