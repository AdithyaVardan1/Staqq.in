export interface FundamentalData {
    ticker: string;
    description: string;
    sector: string;
    industry: string;
    marketCap: number;
    peRatio: number;
    pegRatio: number;
    pbRatio: number;
    beta: number;
    divYield: number;
    netMargin: number;
    roe: number;
    roa: number;
    eps: number;
    high52: number;
    low52: number;
    debtToEquity: number;
    website: string;
    price?: number;
    change?: number;
    percentChange?: number;
    financials: {
        quarterly: {
            period: string;
            revenue: number;
            profit: number;
            networth: number;
            eps: number;
        }[];
        annual: {
            year: string;
            revenue: number;
            profit: number;
            networth: number;
            eps: number;
        }[];
    };
}

export class YahooFinanceService {
    private static instance: YahooFinanceService;
    private yf: any = null;

    private constructor() {}

    public static getInstance(): YahooFinanceService {
        if (!YahooFinanceService.instance) {
            YahooFinanceService.instance = new YahooFinanceService();
        }
        return YahooFinanceService.instance;
    }

    private async getClient(): Promise<any> {
        if (!this.yf) {
            const YFClass = (await import('yahoo-finance2')).default;
            this.yf = new (YFClass as any)({ suppressNotices: ['yahooSurvey'] });
        }
        return this.yf;
    }

    public async getFundamentals(ticker: string): Promise<FundamentalData | null> {
        try {
            console.log(`[Yahoo] Starting fetch for ticker: ${ticker}`);

            // Append .NS if missing (assuming NSE)
            const symbol = ticker.endsWith('.NS') || ticker.endsWith('.BO') ? ticker : `${ticker}.NS`;
            console.log(`[Yahoo] Using symbol: ${symbol}`);

            const yf = await this.getClient();

            console.log(`[Yahoo] Calling quoteSummary for: ${symbol}`);
            const quote: any = await yf.quoteSummary(symbol, {
                modules: [
                    'summaryDetail',
                    'defaultKeyStatistics',
                    'financialData',
                    'assetProfile',
                    'incomeStatementHistory',
                    'incomeStatementHistoryQuarterly',
                    'balanceSheetHistory',
                    'balanceSheetHistoryQuarterly',
                ]
            });

            console.log(`[Yahoo] Quote received for ${symbol}:`, Object.keys(quote));

            const summary = quote.summaryDetail;
            const stats = quote.defaultKeyStatistics;
            const financials = quote.financialData;
            const profile = quote.assetProfile;

            const result: FundamentalData = {
                ticker: symbol,
                description: profile?.longBusinessSummary || '',
                sector: profile?.sector || 'Unknown',
                industry: profile?.industry || 'Unknown',
                website: profile?.website || '',

                price: financials?.currentPrice || summary?.previousClose || 0,
                change: (financials?.currentPrice || 0) - (summary?.previousClose || 0),
                percentChange: summary?.previousClose ? (((financials?.currentPrice || 0) - summary.previousClose) / summary.previousClose) * 100 : 0,

                marketCap: summary?.marketCap || 0,
                peRatio: summary?.trailingPE || stats?.forwardPE || 0,
                pegRatio: stats?.pegRatio || 0,
                pbRatio: stats?.priceToBook || 0,

                beta: summary?.beta || 0,
                divYield: summary?.dividendYield || 0,
                high52: summary?.fiftyTwoWeekHigh || 0,
                low52: summary?.fiftyTwoWeekLow || 0,

                netMargin: financials?.profitMargins || 0,
                roe: financials?.returnOnEquity || 0,
                roa: financials?.returnOnAssets || 0,
                eps: stats?.trailingEps || 0,

                debtToEquity: financials?.debtToEquity || 0,

                financials: {
                    quarterly: (quote.incomeStatementHistoryQuarterly?.incomeStatementHistory || []).map((item: any, idx: number) => {
                        const bs = quote.balanceSheetHistoryQuarterly?.balanceSheetStatements?.[idx];
                        return {
                            period: new Date(item.endDate).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                            revenue: item.totalRevenue || 0,
                            profit: item.netIncome || 0,
                            networth: (bs?.totalAssets || 0) - (bs?.totalLiab || 0),
                            eps: item.dilutedEps || 0
                        };
                    }).reverse(),
                    annual: (quote.incomeStatementHistory?.incomeStatementHistory || []).map((item: any, idx: number) => {
                        const bs = quote.balanceSheetHistory?.balanceSheetStatements?.[idx];
                        return {
                            year: `FY ${new Date(item.endDate).getFullYear()}`,
                            revenue: item.totalRevenue || 0,
                            profit: item.netIncome || 0,
                            networth: (bs?.totalAssets || 0) - (bs?.totalLiab || 0),
                            eps: item.dilutedEps || 0
                        };
                    }).reverse()
                }
            };

            console.log(`[Yahoo] Successfully processed data for ${symbol}`);
            return result;

        } catch (error: any) {
            console.error(`[Yahoo] Error fetching fundamentals for ${ticker}:`, {
                message: error.message,
                name: error.name
            });
            return null;
        }
    }

    public async search(query: string): Promise<any[]> {
        try {
            const yf = await this.getClient();
            const result = await yf.search(query, { region: 'IN', lang: 'en-IN' });
            return result?.quotes || [];
        } catch (error: any) {
            console.error(`[Yahoo] Search error:`, error.message);
            return [];
        }
    }

    public async getQuote(symbol: string): Promise<any | null> {
        try {
            const yf = await this.getClient();
            return await yf.quote(symbol);
        } catch (error: any) {
            console.error(`[Yahoo] Quote error for ${symbol}:`, error.message);
            return null;
        }
    }

    /**
     * Historical price series for charts. Free via Yahoo and not subject to
     * Angel One's tight rate limits, so we offload all history here.
     */
    public async getChart(ticker: string, range: string): Promise<
        { date: string; value: number; open: number; high: number; low: number; volume: number }[]
    > {
        const symbol = ticker.endsWith('.NS') || ticker.endsWith('.BO') ? ticker : `${ticker}.NS`;

        // range -> { daysBack, interval } (Yahoo intraday: 5m ~60d, daily otherwise)
        const CFG: Record<string, { daysBack: number; interval: string }> = {
            '1D':  { daysBack: 2,    interval: '5m'  },
            '1W':  { daysBack: 7,    interval: '30m' },
            '1M':  { daysBack: 31,   interval: '1d'  },
            '3M':  { daysBack: 93,   interval: '1d'  },
            '6M':  { daysBack: 186,  interval: '1d'  },
            '1Y':  { daysBack: 366,  interval: '1d'  },
            '5Y':  { daysBack: 1825, interval: '1wk' },
            'ALL': { daysBack: 3650, interval: '1mo' },
        };
        const { daysBack, interval } = CFG[range] || CFG['1M'];
        const intraday = interval.endsWith('m') || interval.endsWith('h');

        try {
            const yf = await this.getClient();
            const period1 = new Date(Date.now() - daysBack * 86400 * 1000);
            const result: any = await yf.chart(symbol, { period1, interval });
            const quotes: any[] = result?.quotes || [];

            return quotes
                .filter(q => q.close != null)
                .map(q => {
                    const d = new Date(q.date);
                    const label = intraday
                        ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
                        : d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
                    return {
                        date: label,
                        value: q.close,
                        open: q.open ?? q.close,
                        high: q.high ?? q.close,
                        low: q.low ?? q.close,
                        volume: q.volume ?? 0,
                    };
                });
        } catch (error: any) {
            console.error(`[Yahoo] Chart error for ${symbol} (${range}):`, error.message);
            return [];
        }
    }

    public async getBatchQuotes(tickers: string[]): Promise<Record<string, any>> {
        const results: Record<string, any> = {};
        const symbols = tickers.map(t => t.endsWith('.NS') ? t : `${t}.NS`);
        const yf = await this.getClient();

        const batchSize = 10;
        for (let i = 0; i < symbols.length; i += batchSize) {
            const batch = symbols.slice(i, i + batchSize);
            const settled = await Promise.allSettled(batch.map((sym: string) => yf.quote(sym)));
            for (let j = 0; j < batch.length; j++) {
                const res = settled[j];
                if (res.status === 'fulfilled' && res.value) {
                    const q = res.value;
                    results[tickers[i + j]] = {
                        currentPrice: q.regularMarketPrice || 0,
                        regularMarketChangePercent: q.regularMarketChangePercent || 0,
                        regularMarketChange: q.regularMarketChange || 0,
                        marketCap: q.marketCap || 0,
                        peRatio: q.trailingPE || 0,
                        sector: q.sector || 'Unknown',
                    };
                }
            }
        }
        return results;
    }
}

export const yahoo = YahooFinanceService.getInstance();
