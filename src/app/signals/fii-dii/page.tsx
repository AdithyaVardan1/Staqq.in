import React from 'react';
import { TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';
import { fetchFiiDiiToday, fetchFiiDiiHistory } from '@/lib/fiiDii';
import styles from '../shared.module.css';
import { DatasetStructuredData, StructuredData, BreadcrumbStructuredData } from '@/components/StructuredData';

export const revalidate = 900;

export const metadata = {
    title: 'FII / DII Daily Buy/Sell Flows NSE/BSE | Staqq',
    description: 'Foreign (FII) and Domestic (DII) institutional daily buy/sell data for the Indian stock market. Real-time net positioning and trend analysis from NSE.',
    alternates: {
        canonical: '/signals/fii-dii',
    }
};

function inr(n: number): string {
    return Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default async function FiiDiiPage() {
    const [today, history] = await Promise.all([
        fetchFiiDiiToday(),
        fetchFiiDiiHistory(10),
    ]);

    const maxNet = history.length > 0
        ? Math.max(...history.map(d => Math.abs(d.totalNet)), 1)
        : 1;

    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://staqq.in';

    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': [
            {
                '@type': 'Question',
                'name': 'What is the FII net buy/sell data today?',
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': today
                        ? `On ${today.date}, FIIs (Foreign Institutional Investors) were net ${today.fii.net >= 0 ? 'buyers' : 'sellers'} of ₹${inr(Math.abs(today.fii.net))} Cr in Indian equities. They bought ₹${inr(today.fii.buy)} Cr and sold ₹${inr(today.fii.sell)} Cr.`
                        : 'FII net buy/sell data is updated daily after NSE market close (~4:30 PM IST).',
                }
            },
            {
                '@type': 'Question',
                'name': 'What are DII flows today?',
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': today
                        ? `On ${today.date}, DIIs (Domestic Institutional Investors) were net ${today.dii.net >= 0 ? 'buyers' : 'sellers'} of ₹${inr(Math.abs(today.dii.net))} Cr. They bought ₹${inr(today.dii.buy)} Cr and sold ₹${inr(today.dii.sell)} Cr.`
                        : 'DII flow data is updated daily after market close.',
                }
            },
            {
                '@type': 'Question',
                'name': 'What does FII buying mean for the Indian stock market?',
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': 'When FIIs are net buyers, it signals positive foreign sentiment toward Indian equities and typically supports market upside. Sustained FII buying often leads to Nifty and Sensex gains. Conversely, FII selling puts downward pressure on Indian markets, especially large-cap stocks.',
                }
            },
            {
                '@type': 'Question',
                'name': 'What is the difference between FII and DII in the stock market?',
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': 'FII (Foreign Institutional Investors) are overseas entities like hedge funds and sovereign wealth funds investing in Indian markets. DII (Domestic Institutional Investors) include Indian mutual funds, insurance companies, and banks. They often act as counterweights   when FIIs sell, DIIs tend to buy, providing market stability.',
                }
            },
            {
                '@type': 'Question',
                'name': 'How often is FII DII data updated on Staqq?',
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': 'FII and DII data on Staqq is sourced from NSE India and updated daily after market close, typically available by 7:00–7:30 PM IST on trading days.',
                }
            },
        ],
    };

    return (
        <main className={styles.main}>
            <DatasetStructuredData
                name="FII DII Daily Institutional Flows   India"
                description="Daily net buy/sell values of Foreign Institutional Investors (FII/FPI) and Domestic Institutional Investors (DII) in the Indian cash equity market. Sourced from NSE India."
                url={`${BASE_URL}/signals/fii-dii`}
                dateModified={new Date().toISOString()}
                keywords={["FII data today", "DII data today", "FII DII flows NSE", "institutional buying India", "foreign investor data India"]}
            />
            <StructuredData schema={faqSchema} />
            <BreadcrumbStructuredData items={[
                { name: 'Home',     item: BASE_URL },
                { name: 'Signals',  item: `${BASE_URL}/signals` },
                { name: 'FII / DII', item: `${BASE_URL}/signals/fii-dii` },
            ]} />
            <div className="container">
                <div className={styles.header} style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both', animationDelay: '0.1s' }}>
                    <div className={styles.eyebrow}>INSTITUTIONAL FLOWS</div>
                    <h1 className={styles.title}>
                        FII / DII <span className={styles.accent}>Flows</span>
                    </h1>
                    <p className={styles.subtitle}>
                        Where foreign and domestic institutions are putting money. Updated daily after market close.
                    </p>
                    {today && (
                        <div className={styles.dateTag}>
                            <span className={styles.dateDot} />
                            Data as of {today.date}
                        </div>
                    )}
                </div>

                {today ? (
                    <>
                        <div className={styles.statGrid} style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both', animationDelay: '0.2s' }}>
                            <div className={styles.statCard}>
                                <div className={styles.statLabel}>FII / FPI Net</div>
                                <div className={styles.statVal} style={{ color: today.fii.net >= 0 ? '#22c55e' : '#ef4444' }}>
                                    {today.fii.net >= 0 ? '+' : '−'}₹{inr(today.fii.net)} Cr
                                </div>
                                <div className={styles.statSub}>
                                    Buy ₹{inr(today.fii.buy)} Cr · Sell ₹{inr(today.fii.sell)} Cr
                                </div>
                            </div>

                            <div className={styles.statCard}>
                                <div className={styles.statLabel}>DII Net</div>
                                <div className={styles.statVal} style={{ color: today.dii.net >= 0 ? '#22c55e' : '#ef4444' }}>
                                    {today.dii.net >= 0 ? '+' : '−'}₹{inr(today.dii.net)} Cr
                                </div>
                                <div className={styles.statSub}>
                                    Buy ₹{inr(today.dii.buy)} Cr · Sell ₹{inr(today.dii.sell)} Cr
                                </div>
                            </div>

                            <div className={styles.statCard}>
                                <div className={styles.statLabel}>Combined Net</div>
                                <div className={styles.statVal} style={{ color: today.totalNet >= 0 ? '#22c55e' : '#ef4444' }}>
                                    {today.totalNet >= 0 ? '+' : '−'}₹{inr(today.totalNet)} Cr
                                </div>
                                <div className={styles.statSub}>FII + DII total</div>
                            </div>

                            <div className={styles.statCard}>
                                <div className={styles.statLabel}>Market Pulse</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                                    {today.totalNet > 500
                                        ? <TrendingUp size={20} color="#22c55e" />
                                        : today.totalNet < -500
                                        ? <TrendingDown size={20} color="#ef4444" />
                                        : <Minus size={20} color="#f59e0b" />
                                    }
                                    <span style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-outfit)', color: today.totalNet >= 0 ? '#22c55e' : '#ef4444' }}>
                                        {today.totalNet >= 0 ? 'Net Buying' : 'Net Selling'}
                                    </span>
                                </div>
                                <div className={styles.statSub}>
                                    {today.fii.net >= 0 ? 'FII buying' : 'FII selling'} · {today.dii.net >= 0 ? 'DII buying' : 'DII selling'}
                                </div>
                            </div>
                        </div>

                        {history.length > 1 && (
                            <div className={styles.trendSection} style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both', animationDelay: '0.3s' }}>
                                <div className={styles.trendHeader}>
                                    <span className={styles.trendTitle}>10-Day Combined Net Flow</span>
                                    <div className={styles.trendLegend}>
                                        <span className={styles.trendLegendItem}>
                                            <span className={styles.trendLegendDot} style={{ background: '#22c55e' }} />
                                            Net buy
                                        </span>
                                        <span className={styles.trendLegendItem}>
                                            <span className={styles.trendLegendDot} style={{ background: '#ef4444' }} />
                                            Net sell
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.trendBars}>
                                    <div className={styles.trendZero} />
                                    {history.map((day, i) => {
                                        const pct = Math.max(4, Math.round((Math.abs(day.totalNet) / maxNet) * 52));
                                        const parts = day.date.split('-');
                                        const label = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : day.date;
                                        return (
                                            <div key={i} className={styles.trendDay} title={`${day.date}: ${day.totalNet >= 0 ? '+' : '−'}₹${inr(day.totalNet)} Cr`}>
                                                <div className={day.totalNet >= 0 ? styles.trendBarPos : styles.trendBarNeg} style={{ height: pct }} />
                                                <span className={styles.trendDayLabel}>{label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className={styles.tableSection} style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both', animationDelay: '0.4s' }}>
                            <div className={styles.tableSectionTitle}>Today's Breakdown</div>
                            <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Category</th>
                                            <th>Buy (₹ Cr)</th>
                                            <th>Sell (₹ Cr)</th>
                                            <th>Net (₹ Cr)</th>
                                            <th>Signal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[{ label: 'FII / FPI', vals: today.fii }, { label: 'DII', vals: today.dii }].map(({ label, vals }) => (
                                            <tr key={label}>
                                                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{label}</td>
                                                <td className={styles.positive}>₹{inr(vals.buy)}</td>
                                                <td className={styles.negative}>₹{inr(vals.sell)}</td>
                                                <td className={vals.net >= 0 ? styles.positive : styles.negative}>
                                                    {vals.net >= 0 ? '+' : '−'}₹{inr(vals.net)}
                                                </td>
                                                <td><span className={vals.net >= 0 ? styles.buyBadge : styles.sellBadge}>{vals.net >= 0 ? 'Net Buy' : 'Net Sell'}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both', animationDelay: '0.5s', marginTop: 24, padding: '16px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>How to read this</div>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
                                FII/FPI are global funds (BlackRock, Vanguard, sovereign funds). Their moves signal global risk appetite for India. DII includes mutual funds and insurance companies (LIC, SBI MF)   they typically buy when FII sells. When both are net buyers, it is broadly bullish. When FII sells and DII absorbs, the market holds steady. When both sell together, watch for corrections.
                            </p>
                        </div>

                        <div className={styles.sourceNote} style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both', animationDelay: '0.6s' }}>
                            <ExternalLink size={11} />
                            Source: NSE India · Published after market close (~7–8 PM IST on trading days)
                        </div>
                    </>
                ) : (
                    <div className={styles.emptyState}>
                        <TrendingUp size={40} style={{ opacity: 0.25 }} />
                        <h3>Data not available yet</h3>
                        <p>FII/DII data is published after market close. Check back after 7 PM IST on trading days.</p>
                    </div>
                )}
            </div>
        </main>
    );
}
