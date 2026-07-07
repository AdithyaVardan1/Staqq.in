
import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, TrendingUp, TrendingDown, Calendar, Flame, Crown, Zap, Clock } from 'lucide-react';
import type { IPOData } from '@/lib/ipo';
import { calculateIPOScore, getScoreGradient } from '@/lib/ipoScore';
import { getSubscriptionDemand } from '@/lib/ipoAnalytics';
import { BETA_UNLOCK_ALL } from '@/lib/beta';
import styles from './IPOCard.module.css';

interface IPOCardProps {
    ipo: IPOData;
    showScore?: boolean;
}

// Color theme per status
const STATUS_THEME = {
    Live:     { accent: '#22c55e', glow: 'rgba(34,197,94,0.12)',   label: 'LIVE',     dotColor: '#22c55e' },
    Upcoming: { accent: '#f59e0b', glow: 'rgba(245,158,11,0.10)',  label: 'UPCOMING', dotColor: '#f59e0b' },
    Listed:   { accent: '#caff00', glow: 'rgba(202,255,0,0.09)',   label: 'LISTED',   dotColor: '#caff00' },
    Closed:   { accent: '#caff00', glow: 'rgba(202,255,0,0.09)',   label: 'LISTED',   dotColor: '#caff00' },

};

export const IPOCard: React.FC<IPOCardProps> = ({ ipo, showScore = false }) => {
    const revealScore = showScore || BETA_UNLOCK_ALL;
    const score = calculateIPOScore(ipo);
    const isLive = ipo.status === 'Live';
    const isUpcoming = ipo.status === 'Upcoming';
    const isListed = ipo.status === 'Listed' || ipo.status === 'Closed';

    const theme = STATUS_THEME[ipo.status as keyof typeof STATUS_THEME] ?? STATUS_THEME.Upcoming;

    // GMP logic
    const gmpVal = ipo.gmpPercent ?? 0;
    const gmpPositive = gmpVal > 0;
    const gmpNegative = gmpVal < 0;

    // Formatted strings
    const priceDisplay = (ipo.price !== null && !isNaN(ipo.price)) ? `₹${ipo.price}` : '—';
    const gmpDisplay = (ipo.gmp !== null && !isNaN(ipo.gmp))
        ? `${ipo.gmp >= 0 ? '+' : ''}₹${ipo.gmp}`
        : '—';
    const gmpPctDisplay = (ipo.gmpPercent !== null && !isNaN(ipo.gmpPercent))
        ? `${ipo.gmpPercent >= 0 ? '+' : ''}${ipo.gmpPercent}%`
        : '';
    const dateDisplay = [ipo.openDate, ipo.closeDate].filter(Boolean).join(' – ') || 'TBA';
    const estDisplay = ipo.estListing ? `₹${ipo.estListing}` : null;

    // Subscription demand
    const demand = (ipo.subscriptionNum !== null && ipo.subscriptionNum > 0)
        ? getSubscriptionDemand(ipo.subscriptionNum)
        : null;

    return (
        <Link href={`/ipo/${ipo.slug}`} className={styles.card} style={{ '--accent': theme.accent, '--glow': theme.glow } as React.CSSProperties}>

            {/* Top accent line */}
            <span className={styles.topBar} />

            {/* Ambient glow blob */}
            <span className={styles.glowBlob} />

            {/* ── Header ── */}
            <div className={styles.header}>
                {/* Logo + name */}
                <div className={styles.logoWrapper}>
                    <div className={styles.logo}>
                        {ipo.name.charAt(0)}
                    </div>
                </div>
                <div className={styles.nameBlock}>
                    <h3 className={styles.name}>{ipo.name}</h3>
                    <div className={styles.meta}>
                        <Calendar size={11} />
                        <span>{dateDisplay}</span>
                        {ipo.category && <span className={styles.catPill}>{ipo.category}</span>}
                    </div>
                </div>

                {/* Status chip + score */}
                <div className={styles.headerRight}>
                    <span className={styles.statusChip}>
                        {isLive && <span className={styles.livePulse} />}
                        {theme.label}
                    </span>
                    {revealScore ? (
                        <div className={styles.scoreBadge} style={{ background: getScoreGradient(score.overall) }} title={`${score.label} — ${score.confidence} confidence`}>
                            {score.overall}
                        </div>
                    ) : (
                        <div className={styles.scoreTeaser} title="Upgrade to Pro for IPO Score">
                            <span className={styles.scoreTeaserNum}>{score.overall}</span>
                            <Crown size={8} className={styles.scoreTeaserIcon} />
                        </div>
                    )}
                </div>
            </div>

            {/* ── Key Stats Row ── */}
            <div className={styles.statsRow}>
                <div className={styles.stat}>
                    <span className={styles.statLabel}>Issue Price</span>
                    <span className={styles.statValue}>{priceDisplay}</span>
                </div>

                <div className={styles.statDivider} />

                <div className={styles.stat}>
                    <span className={styles.statLabel}>GMP</span>
                    <span className={`${styles.statValue} ${gmpPositive ? styles.positive : gmpNegative ? styles.negative : styles.neutral}`}>
                        {gmpPositive ? <TrendingUp size={13} /> : gmpNegative ? <TrendingDown size={13} /> : null}
                        {gmpDisplay}
                        {gmpPctDisplay && <span className={styles.gmpPct}>{gmpPctDisplay}</span>}
                    </span>
                </div>

                <div className={styles.statDivider} />

                <div className={styles.stat}>
                    <span className={styles.statLabel}>{isListed ? 'Listed At' : 'Est. Listing'}</span>
                    <span className={styles.statValue}>{estDisplay ?? '—'}</span>
                </div>
            </div>

            {/* ── Subscription bar ── */}
            {ipo.subscriptionNum !== null && ipo.subscriptionNum > 0 && demand && (
                <div className={styles.subSection}>
                    <div className={styles.subTop}>
                        <span className={styles.subLabel}>
                            <Zap size={11} />
                            Subscribed
                        </span>
                        <span className={styles.subValue}>
                            <strong>{ipo.subscriptionNum}x</strong>
                            <span className={styles.demandTag} style={{ color: demand.color }}>
                                {demand.label}
                            </span>
                        </span>
                    </div>
                    <div className={styles.progressTrack}>
                        <div
                            className={styles.progressFill}
                            style={{ width: `${Math.min(ipo.subscriptionNum * 10, 100)}%` }}
                        />
                    </div>
                </div>
            )}

            {/* ── Upcoming countdown / size row ── */}
            {(isUpcoming || ipo.ipoSizeCr) && (
                <div className={styles.metaRow}>
                    {isUpcoming && (
                        <span className={styles.metaPill}>
                            <Clock size={11} />
                            Opens {ipo.openDate || 'TBA'}
                        </span>
                    )}
                    {ipo.ipoSizeCr && (
                        <span className={styles.metaPill}>
                            ₹{ipo.ipoSizeCr} Cr issue
                        </span>
                    )}
                    {ipo.rating > 0 && (
                        <span className={styles.metaPill}>
                            {Array.from({ length: Math.min(ipo.rating, 5) }).map((_, i) => (
                                <Flame key={i} size={11} className={styles.fire} />
                            ))}
                        </span>
                    )}
                </div>
            )}

            {/* ── Footer CTA ── */}
            <div className={styles.footer}>
                <span className={styles.cta}>
                    View Details
                    <ArrowUpRight size={14} />
                </span>
            </div>
        </Link>
    );
};
