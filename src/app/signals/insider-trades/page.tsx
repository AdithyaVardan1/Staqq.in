import React from 'react';
import Link from 'next/link';
import { Users, ExternalLink } from 'lucide-react';
import { fetchInsiderTrades } from '@/lib/insiderTrades';
import styles from '../shared.module.css';

export const revalidate = 900;

export const metadata = {
    title: 'Insider Trades | Staqq Signals',
    description: 'Track promoter and insider trading disclosures from NSE. See what company insiders are buying and selling.',
};

function categoryBadgeClass(cat: string): string {
    const c = cat.toLowerCase();
    if (c.includes('promoter')) return styles.promoterBadge;
    if (c.includes('director')) return styles.directorBadge;
    if (c.includes('kmp') || c.includes('key')) return styles.kmpBadge;
    return styles.genericBadge;
}

/**
 * Classifies NSE PIT transaction modes as positive (insider acquiring/holding more)
 * or negative (insider disposing/reducing holding).
 *
 * Positive = share count goes up or shares are freed:
 *   Market Purchase, Off Market Purchase, ESOP exercise, Allotment,
 *   Preferential Allotment, Bonus, Rights, Conversion (warrants→shares),
 *   Revoke Pledge (freeing previously locked shares), Transmission (inheritance)
 *
 * Negative = share count goes down or shares are locked/given away:
 *   Market Sale, Off Market Sale, Pledge (locking shares as collateral),
 *   Gift (giving away shares), Inter-se Transfer (passing shares to another entity)
 */
function isPositiveTransaction(mode: string): boolean {
    const m = mode.toLowerCase().trim();

    // Acquisitions / increases in holding
    if (m.includes('purchase'))    return true;   // Market Purchase, Off Market Purchase
    if (m.includes('buy'))         return true;
    if (m.includes('allot'))       return true;   // Allotment, Preferential Allotment
    if (m.includes('esop'))        return true;   // ESOPs exercise = receiving shares
    if (m.includes('exercise'))    return true;   // Exercise of options
    if (m.includes('conver'))      return true;   // Conversion of warrants / debentures
    if (m.includes('bonus'))       return true;   // Bonus shares
    if (m.includes('rights'))      return true;   // Rights issue
    if (m.includes('revoke'))      return true;   // Revoke Pledge = freeing shares (positive)
    if (m.includes('transmiss'))   return true;   // Transmission = inheritance of shares

    // Disposals / decreases or locks
    if (m.includes('sale'))        return false;  // Market Sale, Off Market Sale
    if (m.includes('sell'))        return false;
    if (m.includes('pledge'))      return false;  // Pledging shares = bearish signal
    if (m.includes('gift'))        return false;  // Giving away shares
    if (m.includes('transfer'))    return false;  // Inter-se Transfer

    return false; // Unknown — treat as neutral/negative
}

/** Human-readable label for NSE transaction modes */
function simplifyMode(mode: string): string {
    const m = mode.toLowerCase().trim();
    if (m.includes('market purchase'))        return 'Market Buy';
    if (m.includes('market sale'))            return 'Market Sale';
    if (m.includes('off market') && m.includes('purchase')) return 'Off-Market Buy';
    if (m.includes('off market') && m.includes('sale'))     return 'Off-Market Sale';
    if (m.includes('purchase') || m.includes('buy'))        return 'Purchase';
    if (m.includes('sale')     || m.includes('sell'))       return 'Sale';
    if (m.includes('esop'))                   return 'ESOP';
    if (m.includes('allot'))                  return 'Allotment';
    if (m.includes('conver'))                 return 'Conversion';
    if (m.includes('bonus'))                  return 'Bonus';
    if (m.includes('rights'))                 return 'Rights';
    if (m.includes('revoke'))                 return 'Revoke Pledge';
    if (m.includes('pledge'))                 return 'Pledge';
    if (m.includes('gift'))                   return 'Gift';
    if (m.includes('transmiss'))              return 'Transmission';
    if (m.includes('transfer'))               return 'Transfer';
    return mode; // Fallback: show raw value
}

export default async function InsiderTradesPage() {
    const trades = await fetchInsiderTrades(14);

    const buyTrades = trades.filter(t => isPositiveTransaction(t.acquireMode));
    const sellTrades = trades.filter(t => !isPositiveTransaction(t.acquireMode));
    const uniqueSymbols = new Set(trades.map(t => t.symbol)).size;

    return (
        <main className={styles.main}>
            <div className="container">
                <div className={styles.header} style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both', animationDelay: '0.1s' }}>
                    <div className={styles.eyebrow}>CORPORATE GOVERNANCE</div>
                    <h1 className={styles.title}>
                        Insider <span className={styles.accent}>Trades</span>
                    </h1>
                    <p className={styles.subtitle}>
                        Promoter and insider trading disclosures from the last 14 days. Filed under SEBI PIT regulations.
                    </p>
                    <div className={styles.dateTag}>
                        <span className={styles.dateDot} />
                        Last 14 trading days · NSE PIT data
                    </div>
                </div>

                {trades.length > 0 ? (
                    <>
                        <div className={styles.statGrid} style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both', animationDelay: '0.2s' }}>
                            <div className={styles.statCard}>
                                <div className={styles.statLabel}>Total Disclosures</div>
                                <div className={styles.statVal}>{trades.length}</div>
                                <div className={styles.statSub}>{uniqueSymbols} unique companies</div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statLabel}>Buy Transactions</div>
                                <div className={styles.statVal} style={{ color: '#22c55e' }}>{buyTrades.length}</div>
                                <div className={styles.statSub}>Market purchases</div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statLabel}>Sell Transactions</div>
                                <div className={styles.statVal} style={{ color: '#ef4444' }}>{sellTrades.length}</div>
                                <div className={styles.statSub}>Market sales</div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statLabel}>Buy / Sell Ratio</div>
                                <div
                                    className={styles.statVal}
                                    style={{ color: buyTrades.length >= sellTrades.length ? '#22c55e' : '#ef4444' }}
                                >
                                    {sellTrades.length === 0 ? '∞' : (buyTrades.length / sellTrades.length).toFixed(1)}x
                                </div>
                                <div className={styles.statSub}>
                                    {buyTrades.length >= sellTrades.length ? 'Insiders buying more' : 'Insiders selling more'}
                                </div>
                            </div>
                        </div>

                        <div className={styles.tableSection} style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both', animationDelay: '0.3s' }}>
                            <div className={styles.tableSectionTitle}>All Disclosures (last 14 days)</div>
                            <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Symbol</th>
                                            <th>Person</th>
                                            <th>Category</th>
                                            <th>Transaction</th>
                                            <th>Shares</th>
                                            <th>Before %</th>
                                            <th>After %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {trades.map((trade, i) => (
                                            <tr key={i}>
                                                <td className={styles.dateCell}>{trade.transactionDate}</td>
                                                <td>
                                                    <Link href={`/stocks/${trade.symbol}`} className={styles.symbolLink}>
                                                        {trade.symbol}
                                                    </Link>
                                                </td>
                                                <td>
                                                    <span className={styles.clientName}>{trade.personName}</span>
                                                </td>
                                                <td>
                                                    <span className={`${styles.badge} ${categoryBadgeClass(trade.personCategory)}`}>
                                                        {trade.personCategory}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`${styles.badge} ${isPositiveTransaction(trade.acquireMode) ? styles.buyBadge : styles.sellBadge}`}>
                                                        {simplifyMode(trade.acquireMode)}
                                                    </span>
                                                </td>
                                                <td style={{ color: isPositiveTransaction(trade.acquireMode) ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                                                    {isPositiveTransaction(trade.acquireMode) ? '+' : '−'}{trade.sharesAcquired.toLocaleString('en-IN')}
                                                </td>
                                                <td className={styles.dateCell}>{trade.beforePercent}%</td>
                                                <td className={styles.dateCell}>{trade.afterPercent}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both', animationDelay: '0.4s', marginTop: 24, padding: '16px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>What is PIT?</div>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
                                Under SEBI's Prohibition of Insider Trading (PIT) Regulations, company insiders (promoters, directors, KMPs) must disclose all trades above 10 lakh rupees within 2 trading days. These filings are a leading indicator of insider conviction, since insiders have the most accurate view of business fundamentals.
                            </p>
                        </div>

                        <div className={styles.sourceNote} style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both', animationDelay: '0.5s' }}>
                            <ExternalLink size={11} />
                            Source: NSE India · PIT disclosures filed within 2 trading days of transaction
                        </div>
                    </>
                ) : (
                    <div className={styles.emptyState}>
                        <Users size={40} style={{ opacity: 0.25 }} />
                        <h3>No insider trades in the last 14 days</h3>
                        <p>PIT disclosures appear here once filed by company insiders with NSE.</p>
                    </div>
                )}
            </div>
        </main>
    );
}
