import React from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TrendingUp, TrendingDown, ChevronRight, Activity, Plus, Trash2 } from 'lucide-react';
import { Sparkline } from './Sparkline';
import { StockLogo } from './StockLogo';
import { useLiveMarketData } from '@/hooks/useLiveMarketData';
import { useComparisonStore } from '@/store/useComparisonStore';
import styles from './StockCard.module.css';

interface StockCardProps {
    ticker: string;
    name: string;
    price: number;
    change: number; // Percent change
    changeAmount: number; // Price change in ₹
    marketCap: string;
    peRatio: number;
    return1Y: number;
    sparklineData: number[];
    qualifiers?: string[];
    metricLabel?: string;
}

export const StockCard: React.FC<StockCardProps> = ({
    ticker,
    name,
    price: initialPrice,
    change: initialChange,
    changeAmount: initialChangeAmount,
    marketCap,
    peRatio,
    return1Y,
    sparklineData,
    qualifiers = [],
    metricLabel,
}) => {
    const { price, change, changePercent, status } = useLiveMarketData(ticker, initialPrice, initialChangeAmount, initialChange);
    const { selectedTickers, addTicker, removeTicker } = useComparisonStore();

    const isSelected = selectedTickers.includes(ticker);

    const toggleCompare = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isSelected) {
            removeTicker(ticker);
        } else {
            addTicker(ticker);
        }
    };

    // Live calculations
    const displayPrice = price ?? initialPrice;

    // Use live change if available, otherwise fallback to initial props
    const currentChange = changePercent !== undefined ? changePercent : initialChange;
    const currentChangeAmount = change !== undefined ? change : initialChangeAmount;
    const isPositive = currentChange >= 0;
    const isReturnPositive = return1Y >= 0;
    const changeColor = isPositive ? 'var(--status-success)' : 'var(--status-danger)';

    return (
        <Card hoverEffect className={clsx(styles.container, "group relative overflow-hidden")}>
            <div className={styles.cardContent}>
                <div className={styles.header}>
                    <StockLogo ticker={ticker} name={name} size="md" />
                    <div className={styles.tickerInfo}>
                        <div className={styles.tickerHeader}>
                            <h4 className={styles.ticker}>{ticker}</h4>
                            <div className={styles.headerBadges}>
                                {qualifiers.map((q, idx) => (
                                    <span key={idx} className={styles.qualifierBadge}>
                                        {q}
                                    </span>
                                ))}
                                {status === 'live' && (
                                    <span className={styles.liveIndicator} title="Live Data Stream">
                                        <Activity size={10} /> LIVE
                                    </span>
                                )}
                                <button
                                    className={clsx(styles.compareBtn, isSelected && styles.selected)}
                                    onClick={toggleCompare}
                                    title={isSelected ? "Remove from comparison" : "Add to comparison"}
                                >
                                    {isSelected ? <Trash2 size={12} /> : <Plus size={12} />}
                                    {isSelected ? 'Remove' : 'Compare'}
                                </button>
                            </div>
                        </div>
                        <div className={styles.name}>{name}</div>
                    </div>
                </div>

                <div className={styles.priceRow}>
                    <div className={styles.priceSection}>
                        <div className={styles.price}>₹{displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <div className={styles.change} style={{ color: changeColor }}>
                            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {isPositive ? '+' : ''}{currentChange.toFixed(2)}% (₹{Math.abs(currentChangeAmount).toFixed(2)})
                        </div>
                    </div>
                    <div className={styles.chartSection}>
                        <Sparkline data={sparklineData} isPositive={isPositive} />
                    </div>
                </div>

                <div className={styles.metrics}>
                    <div className={styles.metric}>
                        <span className={styles.metricLabel}>M. Cap</span>
                        <span className={styles.metricValue}>{marketCap}</span>
                    </div>
                    <div className={styles.metric}>
                        <span className={styles.metricLabel}>P/E</span>
                        <span className={styles.metricValue}>
                            {peRatio && peRatio > 0 ? peRatio.toFixed(1) : 'N/A'}
                        </span>
                    </div>
                    <div className={styles.metric}>
                        <span className={styles.metricLabel}>{metricLabel || '1Y Return'}</span>
                        <span className={styles.metricValue} style={{ color: isReturnPositive ? 'var(--status-success)' : 'var(--status-danger)' }}>
                            {isReturnPositive ? '+' : ''}{return1Y.toFixed(2)}{metricLabel ? '' : '%'}
                        </span>
                    </div>
                </div>

                <Link href={`/stocks/${ticker}?p=${displayPrice}&c=${currentChangeAmount}&cp=${currentChange}`} className={styles.detailsLink}>
                    <Button variant="secondary" fullWidth size="sm" className={styles.detailsButton}>
                        View Details <ChevronRight size={14} />
                    </Button>
                </Link>
            </div>
        </Card>
    );
};
