import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, Award } from 'lucide-react';
import { getAllIPOs } from '@/lib/ipo';
import { getCategoryStats, getGmpAccuracyStats, getTopGmpMovers } from '@/lib/ipoAnalytics';
import { GmpSentimentBadge } from '@/components/ipo/GmpSentimentBadge';
import styles from './page.module.css';

export const revalidate = 300;

export const metadata = {
    title: 'IPO Analytics | Staqq',
    description: 'Comprehensive IPO performance analytics   GMP accuracy, subscription trends, and market intelligence for Indian IPOs.',
};

export default async function IPOAnalyticsPage() {
    const allIPOs = await getAllIPOs();

    const allStats = getCategoryStats(allIPOs);
    const mainboardStats = getCategoryStats(allIPOs, 'IPO');
    const smeStats = getCategoryStats(allIPOs, 'SME');
    const gmpStats = getGmpAccuracyStats(allIPOs);
    const { topPositive, topNegative, mostSubscribed } = getTopGmpMovers(allIPOs, 8);

    const positiveRate = gmpStats.totalTracked > 0
        ? Math.round((gmpStats.positiveGmpCount / gmpStats.totalTracked) * 100)
        : 0;

    return (
        <main className={styles.main}>
            <div className="container">
                <Link href="/ipo" className={styles.backLink}>
                    <ArrowLeft size={18} /> Back to IPO Hub
                </Link>

                <div className={styles.header}>
                    <h1 className={styles.title}>
                        IPO <span className="text-brand">Analytics</span>
                    </h1>
                    <p className={styles.subtitle}>
                        Deep dive into IPO market performance, GMP trends, and subscription patterns.
                    </p>
                </div>

                {/* Overview Stats */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Market Overview</h2>
                    <div className={styles.statGrid}>
                        <Card className={styles.statCard}>
                            <div className={styles.statLabel}>Total IPOs Tracked</div>
                            <div className={styles.statValue}>{allStats.total}</div>
                        </Card>
                        <Card className={styles.statCard}>
                            <div className={styles.statLabel}>Positive GMP Rate</div>
                            <div className={styles.statValue} style={{ color: positiveRate >= 50 ? '#22c55e' : '#ef4444' }}>
                                {positiveRate}%
                            </div>
                            <div className={styles.statSub}>{gmpStats.positiveGmpCount} of {gmpStats.totalTracked}</div>
                        </Card>
                        <Card className={styles.statCard}>
                            <div className={styles.statLabel}>Avg GMP</div>
                            <div className={styles.statValue} style={{ color: gmpStats.avgGmpPercent >= 0 ? '#22c55e' : '#ef4444' }}>
                                {gmpStats.avgGmpPercent >= 0 ? '+' : ''}{gmpStats.avgGmpPercent}%
                            </div>
                        </Card>
                        <Card className={styles.statCard}>
                            <div className={styles.statLabel}>Mainboard Avg Sub</div>
                            <div className={styles.statValue} style={{ color: 'var(--primary-brand)' }}>
                                {mainboardStats.avgSubscription}x
                            </div>
                        </Card>
                        <Card className={styles.statCard}>
                            <div className={styles.statLabel}>SME Avg Sub</div>
                            <div className={styles.statValue} style={{ color: 'var(--primary-brand)' }}>
                                {smeStats.avgSubscription}x
                            </div>
                        </Card>
                    </div>
                </section>

                {/* GMP Distribution */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>GMP Distribution</h2>
                    <div className={styles.distributionGrid}>
                        {gmpStats.gmpDistribution.map(bucket => {
                            const maxCount = Math.max(...gmpStats.gmpDistribution.map(d => d.count));
                            const widthPercent = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
                            return (
                                <div key={bucket.range} className={styles.distRow}>
                                    <span className={styles.distLabel}>{bucket.range}</span>
                                    <div className={styles.distBarWrapper}>
                                        <div
                                            className={styles.distBar}
                                            style={{ width: `${Math.max(widthPercent, 2)}%` }}
                                        />
                                    </div>
                                    <span className={styles.distCount}>{bucket.count}</span>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Top Movers */}
                <div className={styles.twoCol}>
                    {/* Top Positive GMP */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>
                            <TrendingUp size={20} style={{ color: '#22c55e' }} />
                            Top GMP Gainers
                        </h2>
                        <div className={styles.rankList}>
                            {topPositive.map((ipo, i) => (
                                <Link href={`/ipo/${ipo.slug}`} key={ipo.id} className={styles.rankItem}>
                                    <span className={styles.rank}>#{i + 1}</span>
                                    <span className={styles.rankName}>{ipo.name}</span>
                                    <GmpSentimentBadge gmpPercent={ipo.gmpPercent} />
                                    <span className={styles.rankGmp} style={{ color: '#22c55e' }}>
                                        {ipo.gmpPercent !== null ? `+${ipo.gmpPercent}%` : ' '}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </section>

                    {/* Top Negative GMP */}
                    {topNegative.length > 0 && (
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <TrendingDown size={20} style={{ color: '#ef4444' }} />
                                Weakest GMP
                            </h2>
                            <div className={styles.rankList}>
                                {topNegative.map((ipo, i) => (
                                    <Link href={`/ipo/${ipo.slug}`} key={ipo.id} className={styles.rankItem}>
                                        <span className={styles.rank}>#{i + 1}</span>
                                        <span className={styles.rankName}>{ipo.name}</span>
                                        <GmpSentimentBadge gmpPercent={ipo.gmpPercent} />
                                        <span className={styles.rankGmp} style={{ color: '#ef4444' }}>
                                            {ipo.gmpPercent !== null ? `${ipo.gmpPercent}%` : ' '}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Most Subscribed */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <Award size={20} style={{ color: '#f59e0b' }} />
                        Most Subscribed
                    </h2>
                    <div className={styles.rankList}>
                        {mostSubscribed.map((ipo, i) => (
                            <Link href={`/ipo/${ipo.slug}`} key={ipo.id} className={styles.rankItem}>
                                <span className={styles.rank}>#{i + 1}</span>
                                <span className={styles.rankName}>{ipo.name}</span>
                                <span className={styles.rankCategory}>{ipo.category}</span>
                                <span className={styles.rankGmp} style={{ color: 'var(--primary-brand)' }}>
                                    {ipo.subscriptionNum}x
                                </span>
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
}
