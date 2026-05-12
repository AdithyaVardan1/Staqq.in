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
    Trash2
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
                        technicals: f.technicals || prev.technicals
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

    // Helper functions for chart data
    const getChartData = () => {
        const sourceData = activePeriod === 'quarterly'
            ? fundamentals?.financials?.quarterly
            : fundamentals?.financials?.annual;

        if (sourceData && sourceData.length > 0) {
            return [...sourceData].reverse().map(item => ({
                ...item,
                period: 'period' in item ? item.period : (item as any).year,
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
                unit: 'Cr',
                formatter: (value: number) => `₹${value.toLocaleString('en-IN')} Cr`
            },
            profit: {
                dataKey: 'profit',
                name: 'Net Profit',
                color: '#3B82F6',
                unit: 'Cr',
                formatter: (value: number) => `₹${value.toLocaleString('en-IN')} Cr`
            }
        };
        return configs[activeMetric];
    };

    const chartData = getChartData();
    const metricConfig = getMetricConfig();

    return (
        <main className={styles.main}>
            {/* Animated background glows — same as landing page */}
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
                                </div>
                            </div>
                        </div>
                        <div className={styles.priceRow}>
                            <div className={styles.price}>
                                {displayPrice ? `₹${displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '₹ —'}
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
                                    <Badge
                                        variant={dataSource === 'yfinance-python' ? 'success' : 'warning'}
                                        style={{ fontSize: '11px' }}
                                    >
                                        {dataSource === 'yfinance-python' ? 'Live Data' : 'Sample Data'}
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
                                            <div className={styles.statLabel}>{stat.label}</div>
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
                                                        tick={{ fill: '#888', fontSize: 12, fontWeight: 400 }}
                                                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                                                        width={60}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                                                            border: `1px solid ${metricConfig.color}`,
                                                            borderRadius: '12px',
                                                            color: '#fff'
                                                        }}
                                                        formatter={(value: any) => [metricConfig.formatter(value), metricConfig.name]}
                                                        labelFormatter={(label) => `Quarter: ${label}`}
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
                                                            offset={15}
                                                            fill="#ccc"
                                                            fontSize={12}
                                                            fontWeight={600}
                                                            formatter={(val: any) => val?.toLocaleString?.('en-IN') || val}
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
                                            <span className={styles.techName}>{tech.name}</span>
                                            <Badge variant={tech.status.toLowerCase() as any}>{tech.value}</Badge>
                                        </div>
                                        <p className={styles.techDesc}>{tech.interpretation}</p>
                                    </Card>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </main>
    );
}
