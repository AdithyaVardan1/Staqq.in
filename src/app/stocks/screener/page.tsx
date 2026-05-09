'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { StockCard } from '@/components/stocks/StockCard';
import { StockTable } from '@/components/stocks/StockTable';
import { StockCardSkeleton } from '@/components/stocks/StockCardSkeleton';
import { ComparisonTray } from '@/components/comparison/ComparisonTray';
import { BackToTop } from '@/components/ui/BackToTop';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useDebounce } from '@/hooks/useDebounce';
import { LayoutGrid, List, ArrowUpDown, Loader2, AlertCircle, Activity, SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';
import { MobileFilters } from './MobileFilters';
import styles from './page.module.css';

interface Stock {
    ticker: string;
    symbol: string;
    name: string;
    price: number;
    change: number;
    changeAmount: number;
    marketCap: number;
    peRatio: number;
    return1Y: number;
    sector: string;
    sparklineData: number[];
}

interface Filters {
    priceRange: number;
    mcap: string;
    sector: string;
    return1Y: string;
}

const INITIAL_FILTERS: Filters = {
    priceRange: 10000,
    mcap: 'all',
    sector: 'all',
    return1Y: 'all',
};

const SECTORS = [
    { value: 'all', label: 'All Sectors' },
    { value: 'Software', label: 'IT / Software' },
    { value: 'Bank', label: 'Banking' },
    { value: 'Finance', label: 'Financial Services' },
    { value: 'Pharma', label: 'Pharma / Healthcare' },
    { value: 'Auto', label: 'Auto' },
    { value: 'Energy', label: 'Energy / Oil' },
    { value: 'FMCG', label: 'FMCG / Consumer' },
    { value: 'Metals', label: 'Metals / Mining' },
    { value: 'Infrastructure', label: 'Infrastructure' },
    { value: 'Telecom', label: 'Telecom' },
];

const TRENDING_CATEGORIES = [
    'top_gainers', 'top_losers', 'volume_shockers',
    'breakouts_52w', 'breakdowns_52w', 'outperformers',
];

const SECTOR_MAP: Record<string, string[]> = {
    'Software': ['technology', 'software', 'it', 'digital', 'data', 'services'],
    'Bank': ['bank', 'banking'],
    'Finance': ['finance', 'financial', 'investment', 'insurance', 'capital', 'nbfc', 'broker'],
    'Pharma': ['pharma', 'health', 'drugs', 'bio', 'medical', 'hospital', 'pathology'],
    'Auto': ['auto', 'automotive', 'vehicle', 'tire', 'tyre', 'ancillary', 'parts'],
    'Energy': ['energy', 'oil', 'gas', 'power', 'utilities', 'petro', 'coal', 'electricity'],
    'FMCG': ['consumer', 'fmcg', 'beverage', 'food', 'retail', 'staple', 'personal care', 'household'],
    'Metals': ['metal', 'mining', 'steel', 'iron', 'aluminum', 'copper', 'zinc', 'lead'],
    'Infrastructure': ['infra', 'construction', 'cement', 'engineering', 'real estate', 'realty', 'building', 'materials'],
    'Telecom': ['telecom', 'communication', 'mobile', 'network'],
};

function matchesSector(filterValue: string, stockSector: string): boolean {
    if (!filterValue || filterValue === 'all') return true;
    const keywords = SECTOR_MAP[filterValue];
    if (!keywords) return (stockSector || '').toLowerCase().includes(filterValue.toLowerCase());
    
    const stockSectorLower = (stockSector || '').toLowerCase();
    return keywords.some(k => stockSectorLower.includes(k));
}

const RecentlyViewedSection = () => {
    const [recent, setRecent] = useState<string[]>([]);
    useEffect(() => {
        fetch('/api/user/recently-viewed')
            .then(r => r.json())
            .then(d => { if (d.stocks) setRecent(d.stocks.map((s: any) => s.symbol).slice(0, 8)); })
            .catch(() => {});
    }, []);
    if (recent.length === 0) return null;
    return (
        <div className={styles.recentRow}>
            <span className={styles.recentLabel}><Activity size={13} /> RECENTLY VIEWED</span>
            {recent.map(sym => (
                <Link key={sym} href={`/stocks/${sym}`} className={styles.recentTag}>{sym}</Link>
            ))}
        </div>
    );
};

export default function StockScreener() {
    const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
    const debouncedFilters = useDebounce(filters, 300);
    const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
    const [sortBy, setSortBy] = useState('marketCap');
    const [isSortOpen, setIsSortOpen] = useState(false);

    const activeFilterCount = [
        filters.mcap !== 'all',
        filters.sector !== 'all',
        filters.return1Y !== 'all',
        filters.priceRange < 10000,
    ].filter(Boolean).length;

    // Non-trending sorts (marketCap, returns, price-*) are purely client-side.
    // Only re-fetch when filters change, or when switching between trending/screener modes.
    const isTrending = TRENDING_CATEGORIES.includes(sortBy);
    const fetchKey = isTrending ? sortBy : 'screener';

    const fetchStocks = useCallback(async (offset: number) => {
        if (TRENDING_CATEGORIES.includes(sortBy)) {
            const res = await fetch('/api/stocks/trending');
            if (!res.ok) throw new Error('Failed to fetch trending stocks');
            const data = await res.json();
            let categoryStocks = (data.categories?.[sortBy] || []).filter((s: any) => {
                if (s.ltp > debouncedFilters.priceRange) return false;
                if (!matchesSector(debouncedFilters.sector, s.sector)) return false;
                if (debouncedFilters.mcap === 'large' && s.market_cap < 200_000_000_000) return false;
                if (debouncedFilters.mcap === 'mid' && (s.market_cap < 50_000_000_000 || s.market_cap >= 200_000_000_000)) return false;
                if (debouncedFilters.mcap === 'small' && s.market_cap >= 50_000_000_000) return false;
                return true;
            });
            return {
                items: categoryStocks.map((s: any) => ({
                    ...s,
                    ticker: s.symbol,
                    price: s.ltp,
                    changeAmount: (s.change / 100) * s.ltp,
                    marketCap: s.market_cap || 0,
                    peRatio: 0,
                    sparklineData: [],
                    return1Y: sortBy === 'volume_shockers' ? s.spike :
                        sortBy === 'outperformers' ? s.rs :
                        sortBy === 'breakouts_52w' ? (s.ltp / s.high_52w - 1) * 100 :
                        sortBy === 'breakdowns_52w' ? (s.ltp / s.low_52w - 1) * 100 :
                        s.change,
                })),
                hasMore: false,
                total: categoryStocks.length,
                nextOffset: 0,
            };
        }

        const params = new URLSearchParams({
            offset: offset.toString(),
            limit: '10',
            priceMax: debouncedFilters.priceRange.toString(),
            sector: debouncedFilters.sector,
            mcap: debouncedFilters.mcap,
            return1Y: debouncedFilters.return1Y,
            sortBy,
        });
        const res = await fetch(`/api/stocks/screener?${params}`);
        if (!res.ok) throw new Error('Failed to fetch stocks');
        const data = await res.json();
        return { items: data.stocks, hasMore: data.hasMore, total: data.total, nextOffset: data.nextOffset };
    }, [debouncedFilters, sortBy]);

    const { items: stocks, isLoading, error, total, loadMore, intersectionRef, showLoadMoreButton } =
        useInfiniteScroll<Stock>({ fetchData: fetchStocks, dependencies: [debouncedFilters, fetchKey], maxAutoLoads: 10, limit: 10 });

    // Keep previous items visible (dimmed) while a filter change is loading,
    // so the grid never goes blank mid-transition.
    const prevStocksRef = useRef<Stock[]>([]);
    useEffect(() => {
        if (stocks.length > 0) prevStocksRef.current = stocks;
    }, [stocks]);

    const isRefreshing = isLoading && stocks.length === 0;

    const sortedStocks = useMemo(() => {
        const base = isRefreshing ? prevStocksRef.current : stocks;
        if (TRENDING_CATEGORIES.includes(sortBy)) return base;
        return [...base].sort((a, b) => {
            if (sortBy === 'price-high') return b.price - a.price;
            if (sortBy === 'price-low') return a.price - b.price;
            if (sortBy === 'returns') return b.return1Y - a.return1Y;
            return b.marketCap - a.marketCap;
        });
    }, [stocks, sortBy, isRefreshing]);

    const pill = (label: string, value: string, field: keyof Filters) => (
        <button
            key={value}
            className={clsx(styles.pill, filters[field] === value && styles.pillActive)}
            onClick={() => setFilters(prev => ({ ...prev, [field]: value }))}
            suppressHydrationWarning
        >
            {label}
        </button>
    );

    return (
        <main className={styles.main}>
            {/* Animated background glows — same as landing page */}
            <div className={styles.heroGlow} />
            <div className={styles.heroGlowViolet} />

            <div className="container">
                <div className={styles.header}>
                    <div className={styles.eyebrowPill}>
                        <span className={styles.eyebrowDot} />
                        NSE Equity &middot; Live Data
                    </div>
                    <h1 className={styles.title}>
                        Stock <span className={styles.accent}>Screener</span>
                    </h1>
                    <p className={styles.subtitle}>Scan 500+ NSE stocks with real-time filters, smart sorting, and instant comparison.</p>
                </div>

                <RecentlyViewedSection />

                <div className={styles.layout}>
                    {/* Sidebar */}
                    <aside className={styles.sidebar}>
                        <div className={styles.filterPanel}>
                            <div className={styles.filterPanelHeader}>
                                <SlidersHorizontal size={15} />
                                <span>Filters</span>
                                {activeFilterCount > 0 && (
                                    <span className={styles.filterCount}>{activeFilterCount}</span>
                                )}
                                {activeFilterCount > 0 && (
                                    <button className={styles.resetBtn} onClick={() => setFilters(INITIAL_FILTERS)} suppressHydrationWarning>
                                        Reset
                                    </button>
                                )}
                            </div>

                            {/* Price Range */}
                            <div className={styles.filterSection}>
                                <div className={styles.filterLabel}>
                                    Price Range
                                    <span className={styles.filterVal}>
                                        {filters.priceRange >= 10000 ? 'Any' : `≤ ₹${filters.priceRange.toLocaleString()}`}
                                    </span>
                                </div>
                                <input
                                    type="range" min="0" max="10000" step="500"
                                    className={styles.range}
                                    value={filters.priceRange}
                                    onChange={e => setFilters(prev => ({ ...prev, priceRange: parseInt(e.target.value) }))}
                                    suppressHydrationWarning
                                />
                                <div className={styles.rangeLabels}><span>₹0</span><span>₹10k+</span></div>
                            </div>

                            {/* Market Cap */}
                            <div className={styles.filterSection}>
                                <div className={styles.filterLabel}>Market Cap</div>
                                <div className={styles.pillRow}>
                                    {pill('Any', 'all', 'mcap')}
                                    {pill('Large', 'large', 'mcap')}
                                    {pill('Mid', 'mid', 'mcap')}
                                    {pill('Small', 'small', 'mcap')}
                                </div>
                                <div className={styles.capHint}>
                                    {filters.mcap === 'large' && 'Market cap ≥ ₹20,000 Cr'}
                                    {filters.mcap === 'mid'   && 'Market cap ₹5,000 – ₹20,000 Cr'}
                                    {filters.mcap === 'small' && 'Market cap < ₹5,000 Cr'}
                                </div>
                            </div>

                            {/* Sector */}
                            <div className={styles.filterSection}>
                                <div className={styles.filterLabel}>Sector</div>
                                <select
                                    className={styles.select}
                                    value={filters.sector}
                                    onChange={e => setFilters(prev => ({ ...prev, sector: e.target.value }))}
                                    suppressHydrationWarning
                                >
                                    {SECTORS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </div>

                            {/* 1Y Return */}
                            <div className={styles.filterSection}>
                                <div className={styles.filterLabel}>1Y Return</div>
                                <div className={styles.pillRow}>
                                    {pill('Any', 'all', 'return1Y')}
                                    {pill('+ve', 'positive', 'return1Y')}
                                    {pill('>10%', 'top10', 'return1Y')}
                                    {pill('>30%', 'top30', 'return1Y')}
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Results */}
                    <div className={styles.results}>
                        <div className={styles.toolbar}>
                            <div className={styles.toolbarLeft}>
                                {total > 0 && !isLoading && (
                                    <span className={styles.resultCount}>{total} stocks</span>
                                )}
                                <MobileFilters 
                                    filters={filters} 
                                    setFilters={setFilters} 
                                    activeFilterCount={activeFilterCount}
                                    initialFilters={INITIAL_FILTERS}
                                    sectors={SECTORS}
                                />
                            </div>
                            <div className={styles.toolbarRight}>
                                {/* Sort */}
                                <div className={styles.sortWrap}>
                                    <div className={styles.sortTrigger} onClick={() => setIsSortOpen(!isSortOpen)}>
                                        <ArrowUpDown size={14} />
                                        <span>
                                            {sortBy === 'marketCap'       && 'Market Cap'}
                                            {sortBy === 'top_gainers'     && 'Top Gainers'}
                                            {sortBy === 'top_losers'      && 'Top Losers'}
                                            {sortBy === 'volume_shockers' && 'Volume'}
                                            {sortBy === 'breakouts_52w'   && '52W Highs'}
                                            {sortBy === 'breakdowns_52w'  && '52W Lows'}
                                            {sortBy === 'outperformers'   && 'Outperformers'}
                                            {sortBy === 'returns'         && '1Y Returns'}
                                        </span>
                                    </div>
                                    {isSortOpen && (
                                        <>
                                            <div className={styles.sortOverlay} onClick={() => setIsSortOpen(false)} />
                                            <div className={styles.sortMenu}>
                                                {[
                                                    { id: 'marketCap',       label: '💎 Market Cap' },
                                                    { id: 'returns',         label: '📊 1Y Returns' },
                                                    { id: 'top_gainers',     label: '🚀 Top Gainers' },
                                                    { id: 'top_losers',      label: '📉 Top Losers' },
                                                    { id: 'volume_shockers', label: '⚡ Volume' },
                                                    { id: 'breakouts_52w',   label: '📈 52W Highs' },
                                                    { id: 'breakdowns_52w',  label: '📉 52W Lows' },
                                                    { id: 'outperformers',   label: '🏆 Outperformers' },
                                                ].map(opt => (
                                                    <div
                                                        key={opt.id}
                                                        className={clsx(styles.sortOption, sortBy === opt.id && styles.sortOptionActive)}
                                                        onClick={() => { setSortBy(opt.id); setIsSortOpen(false); }}
                                                    >
                                                        {opt.label}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* View toggle */}
                                <div className={styles.viewToggle}>
                                    <button className={clsx(styles.toggleBtn, viewMode === 'card' && styles.toggleActive)} onClick={() => setViewMode('card')} suppressHydrationWarning><LayoutGrid size={16} /></button>
                                    <button className={clsx(styles.toggleBtn, viewMode === 'table' && styles.toggleActive)} onClick={() => setViewMode('table')} suppressHydrationWarning><List size={16} /></button>
                                </div>
                            </div>
                        </div>

                        {error && !isLoading && (
                            <div className={styles.emptyState}>
                                <AlertCircle size={40} style={{ color: 'var(--status-danger)', opacity: 0.7 }} />
                                <p>Could not load stocks. Please try again.</p>
                                <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>Retry</Button>
                            </div>
                        )}

                        {!error && !isLoading && sortedStocks.length === 0 && (
                            <div className={styles.emptyState}>
                                <p>No stocks match your filters.</p>
                                <Button variant="secondary" size="sm" onClick={() => setFilters(INITIAL_FILTERS)}>Clear filters</Button>
                            </div>
                        )}

                        {(sortedStocks.length > 0 || isLoading) && (
                            <>
                                {viewMode === 'card' ? (
                                    <div className={clsx(styles.grid, isRefreshing && styles.gridFading)}>
                                        {sortedStocks.map(stock => (
                                            <StockCard key={stock.ticker} {...stock} marketCap={fmtMcap(stock.marketCap)} />
                                        ))}
                                        {isRefreshing && sortedStocks.length === 0 && [...Array(6)].map((_, i) => <StockCardSkeleton key={i} />)}
                                        {isLoading && !isRefreshing && [...Array(3)].map((_, i) => <StockCardSkeleton key={i} />)}
                                    </div>
                                ) : (
                                    <div className={clsx(isRefreshing && styles.gridFading)}>
                                        <StockTable stocks={sortedStocks} />
                                    </div>
                                )}

                                <div ref={intersectionRef} className={styles.scrollTrigger}>
                                    {isLoading && stocks.length > 0 && (
                                        <div className={styles.loadingMore}>
                                            <Loader2 className={styles.spinner} size={18} />
                                            <span>Loading more...</span>
                                        </div>
                                    )}
                                </div>

                                {showLoadMoreButton && (
                                    <div className={styles.loadMoreWrap}>
                                        <Button variant="secondary" onClick={() => loadMore()}>Show more</Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
            <BackToTop />
            <ComparisonTray />
        </main>
    );
}

function fmtMcap(v: number) {
    if (v >= 1e12) return `₹${(v / 1e12).toFixed(1)}T`;
    if (v >= 1e7)  return `₹${(v / 1e7).toFixed(0)}Cr`;
    return `₹${v.toLocaleString()}`;
}
