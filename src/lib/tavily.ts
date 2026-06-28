import { tavily } from '@tavily/core';

const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY || '' });

export interface NewsArticle {
    title: string;
    url: string;
    content: string;
    score: number;
}

export interface TavilySearchResult {
    articles: NewsArticle[];
    query: string;
}

// Helper to clean raw content into a readable summary
function cleanContent(content: string, title: string): string {
    if (!content) return '';

    // 1. Remove common noise patterns
    let cleaned = content
        .replace(/###\s*Download App/gi, '')
        .replace(/Download the .* App/gi, '')
        .replace(/Skip to content/gi, '')
        .replace(/Subscribe to our newsletter/gi, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/Image \d+:/g, '')
        .replace(/\{\{.*?\}\}/g, '')
        .replace(/\|.*?\|/g, '')
        .replace(/\.\.\./g, '.')
        .replace(/[#*`_]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    // 2. Remove title repetition
    if (title && cleaned.toLowerCase().startsWith(title.toLowerCase())) {
        cleaned = cleaned.slice(title.length).trim();
    }
    cleaned = cleaned.replace(/^[^a-zA-Z0-9]+/, '');

    // 3. Extract up to 2 complete sentences
    const sentences = cleaned.match(/[^.!?]+[.!?]+/g);

    let summary = '';
    if (sentences && sentences.length > 0) {
        summary = sentences.slice(0, 2).join(' ').trim();
    } else {
        // No clear sentence found   just use the cleaned text
        summary = cleaned;
    }

    // 4. Enforce max length
    const MAX_LEN = 220;
    if (summary.length > MAX_LEN) {
        if (sentences && sentences[0].length <= MAX_LEN) {
            summary = sentences[0].trim();
        } else {
            const truncated = summary.slice(0, MAX_LEN);
            const lastDot = truncated.lastIndexOf('.');
            if (lastDot > 50) {
                summary = truncated.slice(0, lastDot + 1);
            } else {
                const lastSpace = truncated.lastIndexOf(' ');
                summary = (lastSpace > 50 ? truncated.slice(0, lastSpace) : truncated) + '.';
            }
        }
    }

    // Ensure proper ending
    if (summary.length > 0 && !/[.!?]$/.test(summary)) summary += '.';

    return summary;
}

const EXCLUDED_DOMAINS = [
    'pinkvilla.com', 'bollywoodhungama.com', 'koimoi.com', 'filmfare.com',
    'indiaherald.com', 'gulte.com', 'tellychakkar.com'
];

// Only block clearly non-financial terms (removed 'star', 'film' which cause false positives)
const ENTERTAINMENT_KEYWORDS = [
    'actress', 'bollywood', 'hollywood', 'tollywood', 'cinema',
    'fashion', 'outfit', 'gown', 'photoshoot', 'gossip',
    'celebrity', 'bikini', 'red carpet'
];

function isRelevantNews(title: string): boolean {
    const text = title.toLowerCase();
    if (ENTERTAINMENT_KEYWORDS.some(kw => text.includes(kw))) return false;
    return true;
}

// Summarizer removed during cleanup   use raw content for now
const summarizeArticle = async (_title: string, content: string) => content;

async function searchNews(query: string, maxResults = 5): Promise<TavilySearchResult> {
    try {
        const response = await tavilyClient.search(query, {
            maxResults: maxResults + 3,
            topic: 'news',
            searchDepth: 'advanced',
            includeAnswer: false,
            excludeDomains: EXCLUDED_DOMAINS,
        });

        const filtered = (response.results || [])
            .filter((r: any) => {
                const content = (r.content || '').trim();
                if (content.length < 30) return false;
                if (content.includes('Access Denied')) return false;
                if (!isRelevantNews(r.title || '')) return false;
                return true;
            })
            .slice(0, maxResults);

        // Summarize each article via Groq (fast, 14,400 RPD   no delays needed)
        const articles: NewsArticle[] = [];
        for (const r of filtered) {
            const title = r.title || '';
            const rawContent = (r.content || '').trim();

            const aiSummary = await summarizeArticle(title, rawContent);

            articles.push({
                title,
                url: r.url || '',
                content: aiSummary || cleanContent(rawContent, title),
                score: r.score || 0,
            });
        }

        return { articles, query };
    } catch (error: any) {
        console.error(`[Tavily] Search failed for "${query}":`, error.message);
        return { articles: [], query };
    }
}

export async function fetchMarketSummary(): Promise<TavilySearchResult> {
    return searchNews('India stock market Nifty 50 Sensex weekly recap BSE NSE performance', 3);
}

export async function fetchIPONews(): Promise<TavilySearchResult> {
    return searchNews('India IPO 2026 upcoming listing GMP subscription status NSE BSE', 3);
}

export async function fetchTrendingStocks(): Promise<TavilySearchResult> {
    return searchNews('trending Indian stocks NSE BSE most active gainers losers India', 3);
}

export async function fetchRegulatoryNews(): Promise<TavilySearchResult> {
    return searchNews('RBI SEBI India financial regulation policy update news 2026', 3);
}

export async function fetchFinancialInsight(): Promise<TavilySearchResult> {
    return searchNews('Indian stock market investing tips mutual funds SIP India personal finance', 3);
}
