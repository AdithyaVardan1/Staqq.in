'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import dynamic from 'next/dynamic';

const FinancialChart = dynamic(
    () => import('@/components/charts/FinancialChart').then((mod) => mod.FinancialChart),
    { ssr: false, loading: () => <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Initializing Chart Engine...</div> }
);

import {
    ArrowLeft,
    TrendingUp,
    TrendingDown,
    Share2,
    Bookmark,
    Activity,
    Plus,
    Trash2,
    Tag,
    ExternalLink,
    Info,
} from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useComparisonStore } from '@/store/useComparisonStore';
import { StockLogo } from '@/components/stocks/StockLogo';
import { AlertSubscribeButton } from '@/components/alerts/AlertSubscribeButton';
import { Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from 'recharts';
import { TickerBanner } from '@/components/marketing/TickerBanner';
import styles from './page.module.css';

import { useLiveMarketData } from '@/hooks/useLiveMarketData';

const tooltipDefinitions: Record<string, string> = {
    'Market Cap': "Total market value of a company's outstanding shares of stock.",
    'P/E Ratio': "Price-to-Earnings ratio. Measures the company's current share price relative to its per-share earnings.",
    'P/B Ratio': "Price-to-Book ratio. Compares a company's market value to its book value.",
    'Div Yield': "A ratio showing how much a company pays out in dividends each year relative to its stock price.",
    'ROE': "Return on Equity. A measure of financial performance calculated by dividing net income by shareholders' equity.",
    'ROCE': "Return on Capital Employed. A financial ratio that can be used in assessing a company's profitability and capital efficiency.",
    'Debt to Equity': "A measure of the degree to which a company is financing its operations through debt versus wholly-owned funds.",
    'EPS': "Earnings Per Share. The portion of a company's profit allocated to each outstanding share of common stock.",
    'RSI (14)': "Relative Strength Index. A momentum oscillator that measures the speed and change of price movements.",
    'MACD': "Moving Average Convergence Divergence. A trend-following momentum indicator.",
    '20 DMA': "20-Day Moving Average. The average price over the last 20 days, often used to gauge short-term trend.",
    '50 DMA': "50-Day Moving Average. The average price over the last 50 days, used to gauge intermediate trend.",
    '200 DMA': "200-Day Moving Average. A widely used indicator for long-term trend direction.",
    'Bollinger Bands': "A set of trendlines plotted two standard deviations away from a simple moving average, indicating volatility.",
    'Volume Trend': "Analyzes trading volume to confirm price trends or warn of potential reversals."
};

export default function StockDetailContent({ params }: { params: Promise<{ ticker: string }> }) {
    const resolvedParams = use(params);
    const ticker = resolvedParams.ticker?.toUpperCase() || '';
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Extract initial values from URL for "instant" load
    const urlPrice = parseFloat(searchParams.get('p') || '0');
    const urlChange = parseFloat(searchParams.get('c') || '0');
    const urlChangePercent = parseFloat(searchParams.get('cp') || '0');

    // Initial dynamic state before fundamentals load
    const [data, setData] = useState({
        ticker: ticker,
        fullTicker: ticker.includes('.') ? ticker : `${ticker}.NS`,
        name: ticker,
        price: urlPrice,
        change: urlChange,
        changePercent: urlChangePercent,
        about: "Loading stock information...",
        sector: "---",
        industry: "---",
        founded: "---",
        website: "---",
        stats: [] as any[],
        metrics: {
            valuation: [] as any[],
            profitability: [] as any[],
            leverage: [] as any[]
        },
        financials: {
            quarterly: [] as any[],
            annual: [] as any[]
        },
        news: [] as any[],
        events: [] as any[],
        shareholding: [
            { name: 'Promoters', value: 50.1, color: '#22C55E' },
            { name: 'FII', value: 23.4, color: '#3B82F6' },
            { name: 'DII', value: 14.2, color: '#8B5CF6' },
            { name: 'Public', value: 12.3, color: '#F59E0B' },
        ],
        technicals: [
            { name: 'RSI (14)', value: '55.4', status: 'Neutral', interpretation: 'Market is in a balanced state.' },
            { name: 'MACD', value: '+12.5', status: 'Bullish', interpretation: 'Short-term momentum is positive.' },
            { name: 'Moving Average', value: 'Above 200DMA', status: 'Bullish', interpretation: 'Long-term trend is upward.' }
        ]
    });

    const [timeframe, setTimeframe] = useState('1D');
    const [fundamentals, setFundamentals] = useState<any | null>(null);
    const [isLoadingFundamentals, setIsLoadingFundamentals] = useState(true);
    const [fundamentalsError, setFundamentalsError] = useState<string | null>(null);
    const [lookupLimitHit, setLookupLimitHit] = useState(false);
    const [dataSource, setDataSource] = useState<'yfinance' | 'yfinance-python' | 'mock-fallback' | null>(null);

    // Financial chart state
    const [activeMetric, setActiveMetric] = useState<'revenue' | 'profit'>('revenue');
    const [activePeriod, setActivePeriod] = useState<'quarterly' | 'yearly'>('quarterly');
    const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
    const isWatched = isInWatchlist(data.ticker);

    const { selectedTickers, addTicker, removeTicker } = useComparisonStore();
    const isSelected = selectedTickers.includes(ticker);

    const toggleCompare = () => {
        if (isSelected) removeTicker(ticker);
        else addTicker(ticker);
    };

    const [showDetails, setShowDetails] = useState(false);

    const handleWatchlistToggle = () => {
        if (isWatched) {
            removeFromWatchlist(data.ticker);
        } else {
            addToWatchlist(data.ticker);
        }
    };

    const { price: displayPrice, change: liveChange, changePercent: liveChangePercent, status } = useLiveMarketData(ticker, data.price, data.change, data.changePercent);

    // Use live values if they exist, otherwise fallback to initial data
    const currentChangeAmount = liveChange !== undefined ? liveChange : data.change;
    const currentChangePercent = liveChangePercent !== undefined ? liveChangePercent : data.changePercent;

    const isPositive = currentChangePercent >= 0;

    const [historicalChartData, setHistoricalChartData] = useState<any[]>([]);
    const [isLoadingChart, setIsLoadingChart] = useState(false);

    // Track "Recently Viewed" and "Trending"
    useEffect(() => {
        if (ticker) {
            fetch('/api/user/recently-viewed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticker })
            }).catch(e => console.error('Failed to track view:', e));
        }
    }, [ticker]);

    // Fetch Fundamentals from Yahoo Finance
    useEffect(() => {
        const fetchFundamentals = async () => {
            setIsLoadingFundamentals(true);
            setFundamentalsError(null);
            try {
                console.log(`[StockDetail] Fetching fundamentals for: ${ticker}`);
                const res = await fetch(`/api/stocks/fundamentals?ticker=${ticker}`);

                if (!res.ok) {
                    if (res.status === 429) {
                        setLookupLimitHit(true);
                        setIsLoadingFundamentals(false);
                        return;
                    }
                    const errorText = await res.text();
                    console.error(`[StockDetail] API Error (${res.status}):`, errorText);
                    throw new Error(`API returned ${res.status}: ${errorText}`);
                }

                const result = await res.json();
                console.log(`[StockDetail] API Response:`, result);

                if (result.fundamentals) {
                    const f = result.fundamentals;
                    setFundamentals(f);
                    setDataSource(result.source || 'yfinance-python');

                    // Update main data state with fresh info
                    setData(prev => ({
                        ...prev,
                        name: f.name || prev.name,
                        about: f.description || prev.about,
                        sector: f.sector || prev.sector,
                        industry: f.industry || prev.industry,
                        website: f.website || prev.website,
                        financials: f.financials || prev.financials,
                        events: (f.events || []).map((e: any, idx: number) => ({
                            ...e,
                            id: e.id || `event-${idx}`
                        })),
                        news: (f.news || []).map((n: any, idx: number) => ({
                            id: n.id || `news-${idx}`,
                            title: n.title || '',
                            source: n.source || 'Market News',
                            link: n.link || '',
                            date: n.date || 'Recent'
                        })),
                        shareholding: f.shareholding || prev.shareholding,
                        technicals: (f.technicals && f.technicals.length > 0) ? f.technicals : prev.technicals
                    }));

                    console.log(`[StockDetail] Loaded fundamentals for ${ticker}:`, f);
                } else {
                    setFundamentalsError(result.error || 'Failed to fetch fundamentals');
                }
            } catch (error: any) {
                console.error('[StockDetail] Failed to fetch fundamentals:', error);
                setFundamentalsError(`Network error: ${error.message}`);
            } finally {
                setIsLoadingFundamentals(false);
            }
        };

        fetchFundamentals();
    }, [ticker]);

    // Fetch Historical Data
    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoadingChart(true);
            try {
                const res = await fetch(`/api/stocks/history?ticker=${ticker}&range=${timeframe}`);
                const history = await res.json();
                if (history.history) {
                    setHistoricalChartData(history.history);
                }
            } catch (error) {
                console.error('Failed to fetch history:', error);
            } finally {
                setIsLoadingChart(false);
            }
        };

        fetchHistory();
    }, [ticker, timeframe]);


    // Helper functions to format Yahoo Finance data
    const formatMarketCap = (marketCap: number) => {
        if (marketCap >= 1e12) return `₹${(marketCap / 1e12).toFixed(1)}T`;
        if (marketCap >= 1e9) return `₹${(marketCap / 1e9).toFixed(1)}B`;
        if (marketCap >= 1e7) return `₹${(marketCap / 1e7).toFixed(0)}Cr`;
        return `₹${marketCap.toLocaleString()}`;
    };

    const formatPercentage = (value: number) => {
        return `${(value * 100).toFixed(2)}%`;
    };

    const formatRatio = (value: number) => {
        return value ? value.toFixed(2) : 'N/A';
    };

    // Generate real-time stats from fundamentals
    const getRealStats = () => {
        if (!fundamentals) return data.stats;

        return [
            { label: 'Market Cap', value: formatMarketCap(fundamentals.marketCap) },
            { label: '52-Week High', value: `₹${fundamentals.high52?.toFixed(2) || '--'}` },
            { label: '52-Week Low', value: `₹${fundamentals.low52?.toFixed(2) || '--'}` },
            { label: 'P/E Ratio', value: formatRatio(fundamentals.peRatio) },
            { label: 'Div Yield', value: formatPercentage(fundamentals.divYield) },
            { label: 'Beta', value: formatRatio(fundamentals.beta) },
            { label: 'Source', value: 'yFinance' },
        ];
    };

    // Get company info from fundamentals
    const getCompanyInfo = () => {
        if (!fundamentals) return {
            name: data.name,
            about: data.about,
            sector: data.sector,
            industry: data.industry,
            website: data.website,
            founded: data.founded
        };

        return {
            name: fundamentals.name || ticker,
            about: fundamentals.description || "No description available.",
            sector: fundamentals.sector || "N/A",
            industry: fundamentals.industry || "N/A",
            website: fundamentals.website || "N/A",
            founded: "---"
        };
    };

    const stats = getRealStats();
    const companyInfo = getCompanyInfo();

    // Yahoo Finance returns raw rupee values   convert to Crores for display
    const toCr = (v: number) => Math.round((v || 0) / 1e7);

    const fmtCrLabel = (v: number) => {
        if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L Cr`;
        if (v >= 1000)   return `₹${(v / 1000).toFixed(1)}K Cr`;
        return `₹${v.toFixed(0)} Cr`;
    };

    const fmtCrTick = (v: number) => {
        if (v >= 100000) return `${(v / 100000).toFixed(0)}L Cr`;
        if (v >= 1000)   return `${(v / 1000).toFixed(0)}K Cr`;
        return `${v} Cr`;
    };

    const getChartData = () => {
        const sourceData = activePeriod === 'quarterly'
            ? fundamentals?.financials?.quarterly
            : fundamentals?.financials?.annual;

        if (sourceData && sourceData.length > 0) {
            return [...sourceData].reverse().map((item: any) => ({
                ...item,
                period: 'period' in item ? item.period : item.year,
                revenue: toCr(item.revenue),
                profit: toCr(item.profit),
            }));
        }

        return [];
    };

    const getMetricConfig = () => {
        const configs = {
            revenue: {
                dataKey: 'revenue',
                name: 'Revenue',
                color: '#22C55E',
            },
            profit: {
                dataKey: 'profit',
                name: 'Net Profit',
                color: '#3B82F6',
            }
        };
        return configs[activeMetric];
    };

    const chartData = getChartData();
    const metricConfig = getMetricConfig();

    return (
        <main className={styles.main}>
            {/* Animated background glows   same as landing page */}
            <div className={styles.heroGlow} />
            <div className={styles.heroGlowViolet} />

            <div className="container">
                {/* Back Link & Info Header */}
                <div className={styles.navBar}>
                    <Link href="/stocks/screener" className={styles.backLink}>
                        <ArrowLeft size={18} /> Screener
                    </Link>
                    <div className={styles.actions}>
                        <Button
                            variant={isSelected ? "primary" : "outline"}
                            size="sm"
                            className={styles.watchlistBtn}
                            onClick={toggleCompare}
                        >
                            {isSelected ? <Trash2 size={18} /> : <Plus size={18} />}
                            {isSelected ? 'Remove' : 'Compare'}
                        </Button>
                        <Button variant="ghost" size="icon"><Share2 size={20} /></Button>
                        <Button
                            variant={isWatched ? "primary" : "outline"}
                            size="sm"
                            className={styles.watchlistBtn}
                            onClick={handleWatchlistToggle}
                        >
                            <Bookmark size={18} fill={isWatched ? "currentColor" : "none"} />
                            {isWatched ? 'In Watchlist' : 'Watchlist'}
                        </Button>
                        <AlertSubscribeButton ticker={data.ticker} />
                    </div>
                </div>

                {/* Lookup limit banner */}
                {lookupLimitHit && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        padding: '14px 20px',
                        borderRadius: '12px',
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        fontSize: '0.9rem',
                        color: '#F59E0B',
                        marginBottom: '20px',
                    }}>
                        <span>You have used all 5 free stock lookups for today.</span>
                        <Link
                            href="/signup"
                            style={{ color: '#CAFF00', fontWeight: 600, textDecoration: 'none' }}
                        >
                            Sign up free for more
                        </Link>
                    </div>
                )}

                {/* Stock Header Section */}
                <section className={styles.headerSection}>
                    <div className={styles.lhs}>
                        <div className={styles.logoAndTitle}>
                            <StockLogo ticker={data.ticker} name={companyInfo.name} size="md" />
                            <div>
                                <h1 className={styles.title}>{companyInfo.name} ({data.ticker})</h1>
                                <div className={styles.tickerRow}>
                                    <Badge variant="neutral" className={styles.tickerBadge}>{data.fullTicker}</Badge>
                                    <span className="text-secondary text-sm font-medium">{companyInfo.sector} • {companyInfo.industry}</span>
                                    {status === 'live' && (
                                        <span className={styles.liveIndicator}>
                                            <Activity size={12} /> LIVE
                                        </span>
                                    )}
                                    {status === 'closed' && (
                                        <span className={styles.liveIndicator} style={{ color: '#888', borderColor: 'rgba(255,255,255,0.1)' }}>
                                            Market Closed
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className={styles.priceRow}>
                            <div className={styles.price}>
                                {displayPrice ? `₹${displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '₹  '}
                            </div>
                            {displayPrice ? (
                                <div className={styles.change} style={{ color: isPositive ? 'var(--status-success)' : 'var(--status-danger)' }}>
                                    {isPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                    {isPositive ? '+' : ''}{currentChangeAmount.toFixed(2)} ({currentChangePercent.toFixed(2)}%)
                                </div>
                            ) : null}
                        </div>
                    </div>
                </section>

                {/* Chart Section */}
                <section className={styles.chartSection}>
                    <Card className={styles.chartCard}>
                        <div className={styles.chartHeader}>
                            <div className={styles.timeframeTabs}>
                                {['1D', '1W', '1M', '3M', '6M', '1Y', '5Y', 'ALL'].map(tf => (
                                    <button
                                        key={tf}
                                        className={clsx(styles.tfTab, timeframe === tf && styles.active)}
                                        onClick={() => setTimeframe(tf)}
                                    >
                                        {tf}
                                    </button>
                                ))}
                            </div>
                            <div className={styles.liveIndicator}>
                                <span className={styles.dot}></span> Live Data
                            </div>
                        </div>
                        <div className={styles.chartHost}>
                            {isLoadingChart ? (
                                <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                                    Loading Chart...
                                </div>
                            ) : (
                                <FinancialChart
                                    data={historicalChartData}
                                    height={350}
                                    color={isPositive ? 'var(--status-success)' : 'var(--status-danger)'}
                                />
                            )}
                        </div>
                    </Card>
                </section>

                {/* Grid Layout for details */}
                <div className={styles.detailsGrid}>
                    <div className={styles.mainContent}>
                        {/* Quick Stats Grid */}
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h2 className={styles.sectionHeading}>Quick Stats</h2>
                                {fundamentals && !isLoadingFundamentals && (
                                    <Badge variant="success" style={{ fontSize: '11px' }}>
                                        Live Data
                                    </Badge>
                                )}
                            </div>
                            {isLoadingFundamentals ? (
                                <div className={styles.statsGrid}>
                                    {[...Array(7)].map((_, i) => (
                                        <Card key={i} variant="glass" className={styles.statCard}>
                                            <div className={styles.statLabel}>Loading...</div>
                                            <div className={styles.statVal}>--</div>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.statsGrid}>
                                    {stats.map((stat: any) => (
                                        <Card key={stat.label} variant="glass" className={styles.statCard}>
                                            <div className={styles.statLabel}>
                                                <div className={styles.tooltipContainer}>
                                                    {stat.label}
                                                    {tooltipDefinitions[stat.label] && (
                                                        <>
                                                            <Info size={12} />
                                                            <span className={styles.tooltipText}>{tooltipDefinitions[stat.label]}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={styles.statVal}>{stat.value}</div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Financial Performance */}
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h2 className={styles.sectionHeading}>Financial Performance</h2>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <Badge variant="neutral">Quarterly Trends</Badge>
                                </div>
                            </div>

                            {!data.financials?.quarterly || data.financials.quarterly.length === 0 ? (
                                <Card className={styles.chartCard}>
                                    <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                                        <h3 style={{ marginBottom: '8px', color: '#666' }}>No Financial Data Available</h3>
                                        <p style={{ margin: 0, fontSize: '0.9rem' }}>
                                            Quarterly financial data is not available for this stock.
                                        </p>
                                    </div>
                                </Card>
                            ) : (
                                <div>
                                    <Card className={styles.chartCard}>
                                        <div className={styles.chartHeader}>
                                            <h3 className={styles.chartTitle}>Financials</h3>
                                            <div className={styles.chartTabs}>
                                                <button
                                                    className={`${styles.tabButton} ${activeMetric === 'revenue' ? styles.active : ''}`}
                                                    onClick={() => setActiveMetric('revenue')}
                                                >
                                                    <span>Revenue</span>
                                                </button>
                                                <button
                                                    className={`${styles.tabButton} ${activeMetric === 'profit' ? styles.active : ''}`}
                                                    onClick={() => setActiveMetric('profit')}
                                                >
                                                    <span>Profit</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className={styles.chartContainer}>
                                            <ResponsiveContainer width="100%" height={380}>
                                                <BarChart
                                                    data={chartData}
                                                    margin={{ top: 30, right: 30, left: 20, bottom: 80 }}
                                                    barCategoryGap="25%"
                                                >
                                                    <defs>
                                                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor={metricConfig.color} stopOpacity={0.9} />
                                                            <stop offset="100%" stopColor={metricConfig.color} stopOpacity={0.6} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis
                                                        dataKey="period"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#888', fontSize: 13, fontWeight: 500 }}
                                                        dy={10}
                                                    />
                                                    <YAxis
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#888', fontSize: 11, fontWeight: 400 }}
                                                        tickFormatter={fmtCrTick}
                                                        width={80}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                                                            border: `1px solid ${metricConfig.color}`,
                                                            borderRadius: '12px',
                                                            color: '#fff'
                                                        }}
                                                        formatter={(value: any) => [fmtCrLabel(value), metricConfig.name]}
                                                        labelFormatter={(label) => `Period: ${label}`}
                                                    />
                                                    <Bar
                                                        dataKey={metricConfig.dataKey}
                                                        name={metricConfig.name}
                                                        fill="url(#barGradient)"
                                                        radius={[8, 8, 0, 0]}
                                                        barSize={40}
                                                    >
                                                        <LabelList
                                                            dataKey={metricConfig.dataKey}
                                                            position="top"
                                                            offset={10}
                                                            fill="#ccc"
                                                            fontSize={11}
                                                            fontWeight={600}
                                                            formatter={(val: any) => fmtCrLabel(val)}
                                                        />
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card>
                                </div>
                            )}
                        </section>

                        {/* Technical Indicators */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionHeading}>Technical Indicators</h2>
                            <div className={styles.techIndicators}>
                                {(data.technicals || []).map((tech: any) => (
                                    <Card key={tech.name} className={styles.techCard}>
                                        <div className={styles.techHeader}>
                                            <span className={styles.techName}>
                                                <div className={styles.tooltipContainer}>
                                                    {tech.name}
                                                    {tooltipDefinitions[tech.name] && (
                                                        <>
                                                            <Info size={12} />
                                                            <span className={styles.tooltipText}>{tooltipDefinitions[tech.name]}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </span>
                                            <Badge variant={tech.status.toLowerCase() as any}>{tech.value}</Badge>
                                        </div>
                                        <p className={styles.techDesc}>{tech.interpretation}</p>
                                    </Card>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Right sidebar */}
                    <aside className={styles.sidebar}>
                        {/* Company About */}
                        <Card className={styles.sidebarSection}>
                            <h3 className={styles.sidebarHeading}>About</h3>
                            <p className={styles.aboutText}>
                                {isLoadingFundamentals ? 'Loading company information...' : companyInfo.about}
                            </p>
                            <div className={styles.metaInfo}>
                                {companyInfo.sector && companyInfo.sector !== '---' && (
                                    <div className={styles.metaRow}>
                                        <Tag size={13} />
                                        <span>{companyInfo.sector}{companyInfo.industry && companyInfo.industry !== '---' ? ` · ${companyInfo.industry}` : ''}</span>
                                    </div>
                                )}
                                {companyInfo.website && companyInfo.website !== 'N/A' && companyInfo.website !== '---' && (
                                    <a href={companyInfo.website} target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
                                        <ExternalLink size={12} />
                                        {companyInfo.website.replace(/^https?:\/\//, '')}
                                    </a>
                                )}
                            </div>
                        </Card>

                        {/* Performance Summary */}
                        <Card className={styles.sidebarSection}>
                            <h3 className={styles.sidebarHeading}>Performance Summary</h3>
                            <div className={styles.aboutText} style={{ marginBottom: 12 }}>
                                {(() => {
                                    if (chartData.length >= 2) {
                                        const latest = chartData[chartData.length - 1];
                                        const previous = chartData[chartData.length - 2];
                                        const revGrowth = previous.revenue ? ((latest.revenue - previous.revenue) / previous.revenue * 100).toFixed(1) : 0;
                                        const profGrowth = previous.profit ? ((latest.profit - previous.profit) / previous.profit * 100).toFixed(1) : 0;
                                        const isCooking = Number(revGrowth) > 0 && Number(profGrowth) > 0;
                                        const isCooked = Number(revGrowth) < 0 && Number(profGrowth) < 0;
                                        const trajectory = isCooking ? 'a strong growth trajectory 📈' : (isCooked ? 'a challenging environment 📉' : 'a mixed performance 🤔');
                                        return (
                                            <>
                                                <strong>📊 Financial Overview:</strong> In the latest quarter ({latest.period}), {companyInfo.name} reported <strong>{fmtCrLabel(latest.revenue)}</strong> in revenue, marking a {Math.abs(Number(revGrowth))}% {Number(revGrowth) >= 0 ? 'increase' : 'decrease'}. 
                                                <br/><br/>
                                                Looking at profitability, the company achieved <strong>{fmtCrLabel(latest.profit)}</strong> in net profit, reflecting a {Math.abs(Number(profGrowth))}% {Number(profGrowth) >= 0 ? 'gain' : 'decline'}. 
                                                <br/><br/>
                                                <strong>Summary:</strong> The current financial results indicate {trajectory}, providing insight into how the business is navigating current market conditions.
                                            </>
                                        );
                                    }
                                    return `The financial performance section gives you a bird's eye view of the historical revenue and profit metrics for ${companyInfo.name}. By reviewing these key trends over time, investors can gain a deeper understanding of the company's growth trajectory and underlying business strength.`;
                                })()}
                            </div>
                        </Card>

                        {/* Technical Assessment */}
                        <Card className={styles.sidebarSection}>
                            <h3 className={styles.sidebarHeading}>Technical Assessment</h3>
                            <div className={styles.aboutText} style={{ marginBottom: 12 }}>
                                {(() => {
                                    if (!data.technicals || data.technicals.length === 0) return 'No technical indicators available for analysis at this time.';
                                    const bullishCount = data.technicals.filter((t: any) => t.status.toLowerCase() === 'bullish').length;
                                    const bearishCount = data.technicals.filter((t: any) => t.status.toLowerCase() === 'bearish').length;
                                    const neutralCount = data.technicals.filter((t: any) => t.status.toLowerCase() === 'neutral').length;
                                    const total = data.technicals.length;
                                    
                                    let sentiment = '';
                                    if (bullishCount > bearishCount * 2) sentiment = 'Strongly Bullish 🐂';
                                    else if (bearishCount > bullishCount * 2) sentiment = 'Strongly Bearish 🐻';
                                    else if (bullishCount > bearishCount) sentiment = 'Slightly Bullish ↗️';
                                    else if (bearishCount > bullishCount) sentiment = 'Slightly Bearish ↘️';
                                    else sentiment = 'Neutral / Range-bound ↔️';

                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <p style={{ margin: 0 }}><strong>📉 RSI (Relative Strength):</strong> Measures momentum on a 0-100 scale. High values suggest a stock is overbought, while low values suggest it may be oversold.</p>
                                            <p style={{ margin: 0 }}><strong>📊 MACD (Convergence):</strong> Tracks the relationship between moving averages. Crosses above the signal line generally indicate upward momentum.</p>
                                            <p style={{ margin: 0 }}><strong>📈 Moving Averages (DMA):</strong> Smooths out price data to identify the core trend. A price above the 50-Day Moving Average typically signals an uptrend.</p>
                                            
                                            <div style={{ marginTop: '4px', padding: '14px', background: 'rgba(202, 255, 0, 0.08)', borderRadius: '12px', borderLeft: '4px solid #caff00' }}>
                                                <strong>🤖 Algorithmic Conclusion:</strong><br/>
                                                Out of {total} core indicators, {bullishCount} are Bullish, {bearishCount} are Bearish, and {neutralCount} are Neutral. This scores the stock's current momentum as <strong>{sentiment}</strong>.
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </Card>

                        {/* Shareholding */}
                        {data.shareholding.some((s: any) => s.value > 0) && (
                            <Card className={styles.sidebarSection}>
                                <h3 className={styles.sidebarHeading}>Shareholding</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                                    {data.shareholding.map((s: any) => (
                                        <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem' }}>
                                            <span style={{ width: 70, color: 'var(--text-secondary)', flexShrink: 0 }}>{s.name}</span>
                                            <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 5 }}>
                                                <div style={{ background: s.color, borderRadius: 4, height: 5, width: `${Math.min(s.value, 100)}%`, transition: 'width 0.5s ease' }} />
                                            </div>
                                            <span style={{ width: 44, textAlign: 'right', fontWeight: 600, color: s.color }}>{s.value.toFixed(1)}%</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {/* Latest News */}
                        {data.news.length > 0 && (
                            <Card className={styles.sidebarSection}>
                                <h3 className={styles.sidebarHeading}>Latest News</h3>
                                <div className={styles.newsList}>
                                    {data.news.slice(0, 5).map((n: any) => (
                                        <a key={n.id} href={n.link} target="_blank" rel="noopener noreferrer" className={styles.newsItem}>
                                            <div className={styles.newsTitle}>{n.title}</div>
                                            <div className={styles.newsMeta}>{n.source} · {n.date}</div>
                                        </a>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </aside>
                </div>
            </div>
        </main>
    );
}
