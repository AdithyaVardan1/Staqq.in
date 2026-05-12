
'use client';

import Link from 'next/link';
import { TrendingUp, TrendingDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Sparkline } from './Sparkline';
import { StockLogo } from './StockLogo';
import { useComparisonStore } from '@/store/useComparisonStore';
import clsx from 'clsx';
import styles from './StockTable.module.css';

interface StockTableProps {
    stocks: any[];
}

export const StockTable: React.FC<StockTableProps> = ({ stocks }) => {
    const { selectedTickers, addTicker, removeTicker } = useComparisonStore();

    return (
        <div className={styles.container}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th className={styles.thMain}>Company</th>
                        <th>Price</th>
                        <th>Change</th>
                        <th>M. Cap</th>
                        <th>P/E</th>
                        <th>1Y Return</th>
                        <th className={styles.thChart}>1M Trend</th>
                        <th className={styles.thAction}></th>
                    </tr>
                </thead>
                <tbody>
                    {stocks.map((stock) => {
                        const isPositive = stock.change >= 0;
                        const isReturnPositive = stock.return1Y >= 0;
                        const changeColor = isPositive ? 'var(--status-success)' : 'var(--status-danger)';
                        const isSelected = selectedTickers.includes(stock.ticker);

                        const toggleCompare = () => {
                            if (isSelected) removeTicker(stock.ticker);
                            else addTicker(stock.ticker);
                        };

                        return (
                            <tr key={stock.ticker} className={clsx(styles.row, isSelected && styles.rowSelected)}>
                                <td className={styles.tdMain}>
                                    <div className={styles.header}>
                                        <button 
                                            className={clsx(styles.compareCheck, isSelected && styles.checked)}
                                            onClick={toggleCompare}
                                            title={isSelected ? "Remove from comparison" : "Add to comparison"}
                                        >
                                            {isSelected ? <Trash2 size={12} /> : <Plus size={12} />}
                                        </button>
                                        <StockLogo ticker={stock.ticker} name={stock.name} size="sm" />
                                        <div>
                                            <div className={styles.ticker}>{stock.ticker}</div>
                                            <div className={styles.name}>{stock.name}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className={styles.tdNumber}>
                                    <div className={styles.price}>₹{stock.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                </td>
                                <td className={styles.tdNumber}>
                                    <div className={styles.change} style={{ color: changeColor }}>
                                        {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        {isPositive ? '+' : ''}{stock.change.toFixed(2)}%
                                    </div>
                                </td>
                                <td className={styles.tdNumber}>{fmtMcap(stock.marketCap)}</td>
                                <td className={styles.tdNumber}>
                                    {stock.peRatio && stock.peRatio > 0 ? stock.peRatio.toFixed(1) : 'N/A'}
                                </td>
                                <td className={styles.tdNumber}>
                                    <span style={{ color: isReturnPositive ? 'var(--status-success)' : 'var(--status-danger)' }}>
                                        {isReturnPositive ? '+' : ''}{stock.return1Y.toFixed(2)}%
                                    </span>
                                </td>
                                <td className={styles.tdChart}>
                                    <div className={styles.sparklineWrapper}>
                                        <Sparkline data={stock.sparklineData} isPositive={isPositive} height={30} />
                                    </div>
                                </td>
                                <td className={styles.tdAction}>
                                    <Link href={`/stocks/${stock.ticker}?p=${stock.price}&c=${stock.changeAmount || 0}&cp=${stock.change}`} className={styles.viewLink}>
                                        View <ChevronRight size={14} />
                                    </Link>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

function fmtMcap(v: number) {
    if (!v || isNaN(v)) return '---';
    if (v >= 1e12) return `₹${(v / 1e12).toFixed(1)}T`;
    if (v >= 1e7)  return `₹${(v / 1e7).toFixed(0)}Cr`;
    return `₹${v.toLocaleString()}`;
}
