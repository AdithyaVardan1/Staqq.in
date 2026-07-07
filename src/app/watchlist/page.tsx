
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { TrendingUp, Trash2, BookOpen, Eye } from 'lucide-react';
import { StockCard } from '@/components/stocks/StockCard';
import { StockCardSkeleton } from '@/components/stocks/StockCardSkeleton';
import styles from './page.module.css';
import { useWatchlist } from '@/hooks/useWatchlist';

interface WatchlistItemProps {
    symbol: string;
    onRemove: (s: string) => void;
}

const WatchlistItem: React.FC<WatchlistItemProps> = ({ symbol, onRemove }) => {
    const [data, setData] = React.useState<any>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [confirmDelete, setConfirmDelete] = React.useState(false);

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/stocks/fundamentals?ticker=${symbol.split('.')[0]}`);
                const result = await res.json();
                if (result.fundamentals) {
                    setData(result.fundamentals);
                }
            } catch (error) {
                console.error('Failed to fetch watchlist item data', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [symbol]);

    if (isLoading) return <StockCardSkeleton />;
    if (!data || !data.ticker) return (
        <div className={styles.itemWrapper} style={{ opacity: 0.5 }}>
            <div style={{ padding: '20px', textAlign: 'center', fontSize: '0.8rem', color: '#52525b' }}>
                Could not load data for {symbol}
            </div>
        </div>
    );

    return (
        <div className={styles.itemWrapper}>
            <StockCard
                ticker={data.ticker}
                name={data.name}
                price={data.price}
                change={data.percentChange}
                changeAmount={data.netChange}
                marketCap={formatMarketCap(data.marketCap)}
                peRatio={data.peRatio}
                return1Y={data.roiYear || 0}
                sparklineData={data.sparkline || []}
            />
            {/* Remove button always visible at top-right */}
            <button
                className={`${styles.removeBtn} ${confirmDelete ? styles.removeBtnConfirm : ''}`}
                aria-label="Remove from Watchlist"
                title={confirmDelete ? 'Click again to confirm remove' : 'Remove from watchlist'}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirmDelete) {
                        onRemove(symbol);
                    } else {
                        setConfirmDelete(true);
                        setTimeout(() => setConfirmDelete(false), 2500);
                    }
                }}
            >
                <Trash2 size={13} />
                {confirmDelete ? 'Remove?' : ''}
            </button>
        </div>
    );
};

function formatMarketCap(value: number) {
    if (!value) return 'N/A';
    if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e7) return `${(value / 1e7).toFixed(1)}Cr`;
    return value.toLocaleString();
}

export default function WatchlistPage() {
    const { watchlist, removeFromWatchlist, isLoading } = useWatchlist();

    return (
        <main className={styles.main}>
            <div className="container">

                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerBadge}>
                        <Eye size={12} />
                        Your Watchlist
                    </div>
                    <h1 className={styles.title}>
                        Stocks you&apos;re <span className={styles.accent}>tracking</span>
                    </h1>
                    <p className={styles.subtitle}>
                        {watchlist.length > 0
                            ? `Monitoring ${watchlist.length} stock${watchlist.length > 1 ? 's' : ''} with live data`
                            : 'Add stocks from their detail pages to start tracking them here'
                        }
                    </p>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className={styles.grid}>
                        {[1, 2, 3].map(i => <StockCardSkeleton key={i} />)}
                    </div>
                ) : watchlist.length > 0 ? (
                    <div className={styles.grid}>
                        {watchlist.map((symbol) => (
                            <WatchlistItem
                                key={symbol}
                                symbol={symbol}
                                onRemove={removeFromWatchlist}
                            />
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>
                            <TrendingUp size={32} />
                        </div>
                        <h3 className={styles.emptyTitle}>Your watchlist is empty</h3>
                        <p className={styles.emptyText}>
                            Browse stocks and click <strong>Watchlist</strong> on any stock page to track it here.
                        </p>
                        <div className={styles.emptyActions}>
                            <Link href="/stocks/screener">
                                <Button variant="primary">Explore Stocks</Button>
                            </Link>
                            <Link href="/learn">
                                <Button variant="outline">
                                    <BookOpen size={14} />
                                    Learn the Basics
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
