import React from 'react';
import Link from 'next/link';
import { getAllIPOs } from '@/lib/ipo';
import type { IPOData } from '@/lib/ipo';
import { getCategoryStats } from '@/lib/ipoAnalytics';
import { IPOCard } from '@/components/ipo/IPOCard';
import { IPOPerformanceStats } from '@/components/ipo/IPOPerformanceStats';
import {
    IPOHeroAnimator,
    IPOStatsAnimator,
    IPOLinksAnimator,
    IPOSectionAnimator,
    IPOGridAnimator,
} from '@/components/ipo/IPOPageAnimators';
import { BarChart3, ArrowRight, TrendingUp, Activity, Clock } from 'lucide-react';
import styles from './page.module.css';

export const revalidate = 300;

export const metadata = {
    title: 'IPO Hub | Staqq — Live GMP & IPO Intelligence',
    description: 'India\'s smartest IPO tracker. Live GMP, subscription data, performance analytics, and allotment probability for every IPO.',
    openGraph: {
        title: 'IPO Hub | Live GMP & Intelligence',
        description: 'India\'s smartest IPO tracker. Live GMP, subscription data, performance analytics, and allotment probability.',
        images: ['/api/og?title=IPO+Intelligence+Hub&subtitle=Live+GMP,+subscription+data,+performance+analytics+%26+allotment+probability'],
    },
    twitter: {
        card: 'summary_large_image' as const,
        title: 'IPO Hub | Live GMP & Intelligence | Staqq',
        images: ['/api/og?title=IPO+Intelligence+Hub&subtitle=Live+GMP,+subscription+data,+performance+analytics+%26+allotment+probability'],
    },
};

export default async function IPODashboard() {
    const allIPOs = await getAllIPOs();

    const liveIPOs    = allIPOs.filter(i => i.status === 'Live');
    const upcomingIPOs = allIPOs.filter(i => i.status === 'Upcoming');
    const listedIPOs  = allIPOs.filter(i => i.status === 'Listed' || i.status === 'Closed');
    const mainboardIPOs = allIPOs.filter(i => i.category === 'IPO');
    const smeIPOs     = allIPOs.filter(i => i.category === 'SME');

    const allStats       = getCategoryStats(allIPOs);
    const mainboardStats = getCategoryStats(allIPOs, 'IPO');
    const smeStats       = getCategoryStats(allIPOs, 'SME');

    return (
        <main className={styles.main}>
            {/* ── Ambient background glow ── */}
            <div className={styles.bgGlow1} aria-hidden />
            <div className={styles.bgGlow2} aria-hidden />

            <div className="container">

                {/* ── Hero header ── */}
                <IPOHeroAnimator>
                    <div className={styles.pageHeader}>
                        <div className={styles.headerLeft}>
                            <div className={styles.headerBadge}>
                                <span className={styles.badgeDot} />
                                IPO Intelligence Hub
                            </div>
                            <h1 className={styles.title}>
                                India's smartest<br />
                                <span className={styles.accent}>IPO tracker.</span>
                            </h1>
                            <p className={styles.subtitle}>
                                Live GMP with sentiment scoring, subscription data, performance analytics,
                                and allotment probability — updated every 5 minutes.
                            </p>
                        </div>

                        <div className={styles.headerRight}>
                            <div className={styles.statChip}>
                                <Activity size={13} className={styles.chipIcon} style={{ color: '#22c55e' }} />
                                <span className={styles.chipNum}>{liveIPOs.length}</span>
                                <span className={styles.chipLabel}>Live</span>
                            </div>
                            <div className={styles.statChip}>
                                <Clock size={13} className={styles.chipIcon} style={{ color: '#f59e0b' }} />
                                <span className={styles.chipNum}>{upcomingIPOs.length}</span>
                                <span className={styles.chipLabel}>Upcoming</span>
                            </div>
                            <div className={styles.statChip}>
                                <TrendingUp size={13} className={styles.chipIcon} style={{ color: '#a78bfa' }} />
                                <span className={styles.chipNum}>{listedIPOs.length}</span>
                                <span className={styles.chipLabel}>Listed</span>
                            </div>
                            <div className={styles.statChip} style={{ gridColumn: '1 / -1' }}>
                                <BarChart3 size={13} className={styles.chipIcon} style={{ color: '#38bdf8' }} />
                                <span className={styles.chipNum}>{mainboardIPOs.length}M / {smeIPOs.length}S</span>
                                <span className={styles.chipLabel}>Mainboard / SME</span>
                            </div>
                        </div>
                    </div>
                </IPOHeroAnimator>

                {/* ── Quick links ── */}
                <IPOLinksAnimator>
                    <div className={styles.quickLinks}>
                        <Link href="/ipo/analytics" className={styles.quickLink}>
                            <BarChart3 size={14} />
                            IPO Analytics
                            <ArrowRight size={14} />
                        </Link>
                        <Link href="/ipo/allotment-calculator" className={styles.quickLink}>
                            <BarChart3 size={14} />
                            Allotment Calculator
                            <ArrowRight size={14} />
                        </Link>
                    </div>
                </IPOLinksAnimator>

                {/* ── New-to-IPOs explainer ── */}
                <IPOLinksAnimator>
                    <div className={styles.explainStrip}>
                        <span className={styles.explainTitle}>New to IPOs?</span>
                        <div className={styles.explainItem}>
                            <strong>GMP</strong> — the unofficial grey-market price, a rough hint of listing-day gains.
                        </div>
                        <div className={styles.explainItem}>
                            <strong>Subscription</strong> — how many times the shares were applied for. Higher = more demand.
                        </div>
                        <div className={styles.explainItem}>
                            <strong>Allotment odds</strong> — your rough chance of actually getting shares if you apply.
                        </div>
                    </div>
                </IPOLinksAnimator>

                {/* ── Performance Intelligence ── */}
                <IPOSectionAnimator delay={0}>
                    <div className={styles.sectionHeader}>
                        <h2>Market Intelligence</h2>
                        <Link href="/ipo/analytics" className={styles.viewAll}>
                            Full Analytics <ArrowRight size={14} />
                        </Link>
                    </div>
                    <IPOPerformanceStats
                        allStats={allStats}
                        mainboardStats={mainboardStats}
                        smeStats={smeStats}
                    />
                </IPOSectionAnimator>

                {/* ── Live IPOs ── */}
                {liveIPOs.length > 0 && (
                    <IPOSectionAnimator delay={0.05}>
                        <div className={styles.sectionHeader}>
                            <h2>
                                <span className={styles.sectionDot} style={{ background: '#22c55e' }} />
                                Live IPOs
                            </h2>
                            <span className={styles.count}>{liveIPOs.length} active</span>
                        </div>
                        <IPOGridAnimator className={styles.grid}>
                            {liveIPOs.map((ipo) => (
                                <IPOCard key={ipo.id} ipo={ipo} />
                            ))}
                        </IPOGridAnimator>
                    </IPOSectionAnimator>
                )}

                {/* ── Upcoming IPOs ── */}
                {upcomingIPOs.length > 0 && (
                    <IPOSectionAnimator delay={0.05}>
                        <div className={styles.sectionHeader}>
                            <h2>
                                <span className={styles.sectionDot} style={{ background: '#f59e0b' }} />
                                Upcoming IPOs
                            </h2>
                            <span className={styles.count}>{upcomingIPOs.length} scheduled</span>
                        </div>
                        <IPOGridAnimator className={styles.grid}>
                            {upcomingIPOs.map((ipo) => (
                                <IPOCard key={ipo.id} ipo={ipo} />
                            ))}
                        </IPOGridAnimator>
                    </IPOSectionAnimator>
                )}

                {/* ── Recently Listed ── */}
                {listedIPOs.length > 0 && (
                    <IPOSectionAnimator delay={0.05}>
                        <div className={styles.sectionHeader}>
                            <h2>
                                <span className={styles.sectionDot} style={{ background: '#a78bfa' }} />
                                Recently Listed
                            </h2>
                            <span className={styles.count}>{listedIPOs.length} completed</span>
                        </div>
                        <IPOGridAnimator className={styles.grid}>
                            {listedIPOs.map((ipo) => (
                                <IPOCard key={ipo.id} ipo={ipo} />
                            ))}
                        </IPOGridAnimator>
                    </IPOSectionAnimator>
                )}

            </div>
        </main>
    );
}
