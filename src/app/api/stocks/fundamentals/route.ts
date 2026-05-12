import { NextRequest, NextResponse } from 'next/server';
import { angelOne } from '@/lib/angelone';
import { stockCache } from '@/lib/stock-cache';
import { checkRateLimit } from '@/lib/rate-limiter';
import { yahoo } from '@/lib/yahoo';
import { getUserFromRequest } from '@/utils/supabase/mobile-auth';
import { checkAndIncrementUsage } from '@/lib/subscription';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const ticker = searchParams.get('ticker');
        const invalidate = searchParams.get('invalidate') === 'true';

        if (!ticker) {
            return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
        }

        // Free-tier rate limiting (5 lookups/day)
        const user = await getUserFromRequest(request);
        if (user) {
            const { allowed, current, limit } = await checkAndIncrementUsage(user.id, 'stock_lookups');
            if (!allowed) {
                return NextResponse.json(
                    { error: 'Daily lookup limit reached', upgrade: true, current, limit },
                    { status: 429 }
                );
            }
        }

        // Apply Rate Limit (30 req/min for fundamentals)
        const isAllowed = await checkRateLimit('fundamentals_api', 30, 60);
        if (!isAllowed) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        // Check cache for full data
        const cacheKey = `full_${ticker}`;
        const cached = invalidate ? null : await stockCache.get(cacheKey);
        if (cached) {
            console.log(`[Fundamentals API] Cache Hit: ${ticker}`);
            return NextResponse.json({
                fundamentals: cached,
                source: 'cache'
            });
        }

        console.log(`[Fundamentals API] Fetching data for: ${ticker}`);

        // Fetch fundamentals using yahoo-finance2 (Node.js, no Python needed)
        const result: any = await yahoo.getFundamentals(ticker);

        if (!result) {
            throw new Error(`Failed to fetch fundamentals for ${ticker}`);
        }

        // Enrich with Angel One real-time data
        try {
            const instrument = await angelOne.findInstrument(ticker);
            if (instrument) {
                const [angelRes, quoteRes] = await Promise.all([
                    angelOne.getFundamentalData(instrument.exchange, String(instrument.token)),
                    angelOne.getFullQuote(instrument.exchange, instrument.symbol, String(instrument.token))
                ]);

                if (quoteRes && quoteRes.status && quoteRes.data && quoteRes.data.length > 0) {
                    const quote = quoteRes.data[0];
                    result.price = parseFloat(quote.ltp);
                    result.netChange = parseFloat(quote.netChange || '0');
                    result.percentChange = parseFloat(quote.percentChange || '0');
                }

                // Ensure netChange exists even if only percentChange came from yfinance
                if (result.percentChange && !result.netChange && result.price) {
                    result.netChange = (result.price * (result.percentChange / 100));
                }

                if (angelRes && angelRes.status && angelRes.data) {
                    const fundamentalData = angelRes.data;

                    // Shareholding Pattern
                    if (fundamentalData.ShareholdingPattern) {
                        const sh = fundamentalData.ShareholdingPattern;
                        result.shareholding = [
                            { name: 'Promoters', value: parseFloat(sh.Promoter || '0'), color: '#22C55E' },
                            { name: 'FII', value: parseFloat(sh.FII || '0'), color: '#3B82F6' },
                            { name: 'DII', value: parseFloat(sh.DII || '0'), color: '#8B5CF6' },
                            { name: 'Public', value: parseFloat(sh.Public || '0'), color: '#F59E0B' },
                        ];
                    }

                    // ROE and Dividend Yield from Angel One
                    if (fundamentalData.Fundamental) {
                        const f = fundamentalData.Fundamental;
                        if (f.ROE) result.roe = parseFloat(f.ROE) / 100;
                        if (f.DividendYield) {
                            const rawDiv = parseFloat(f.DividendYield);
                            result.divYield = rawDiv / 1000000;
                        }
                    }

                    // 1Y Price Performance from Angel One
                    if (fundamentalData.PricePerformance?.['1Year']) {
                        result.return1Y = parseFloat(fundamentalData.PricePerformance['1Year']);
                    }
                }
            }
        } catch (e) {
            console.error(`[Fundamentals API] Angel One enrichment failed for ${ticker}:`, e);
        }

        // Default shareholding if not available
        if (!result.shareholding || result.shareholding.length === 0) {
            result.shareholding = [
                { name: 'Promoters', value: 0, color: '#22C55E' },
                { name: 'FII', value: 0, color: '#3B82F6' },
                { name: 'DII', value: 0, color: '#8B5CF6' },
                { name: 'Public', value: 0, color: '#F59E0B' },
            ];
        }

        // Default technicals placeholder
        if (!result.technicals) {
            result.technicals = [];
        }

        // Cache the final result
        await stockCache.set(cacheKey, result);

        return NextResponse.json({
            fundamentals: result,
            source: 'yahoo-finance2'
        });

    } catch (error: any) {
        console.error('[Fundamentals API] Error:', error);
        return NextResponse.json({ error: 'Failed', details: error.message }, { status: 500 });
    }
}
