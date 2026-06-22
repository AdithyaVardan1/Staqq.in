
import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ArrowUpRight, TrendingUp, TrendingDown, Calendar, Flame, Crown } from 'lucide-react';
import type { IPOData } from '@/lib/ipo';
import { calculateIPOScore, getScoreGradient } from '@/lib/ipoScore';
import { getSubscriptionDemand } from '@/lib/ipoAnalytics';
import { BETA_UNLOCK_ALL } from '@/lib/beta';
import styles from './IPOCard.module.css';

interface IPOCardProps {
    ipo: IPOData;
    showScore?: boolean; // Pro users see score, free users see lock
}

export const IPOCard: React.FC<IPOCardProps> = ({ ipo, showScore = false }) => {
    const revealScore = showScore || BETA_UNLOCK_ALL;
    const score = calculateIPOScore(ipo);
    const isLive = ipo.status === 'Live';
    const isUpcoming = ipo.status === 'Upcoming';

    // GMP color logic
    const gmpPositive = (ipo.gmpPercent ?? 0) > 0;
    const gmpNegative = (ipo.gmpPercent ?? 0) < 0;
    const gmpVariant = gmpPositive ? 'success' : gmpNegative ? 'danger' : 'neutral';

    // Status badge
    const statusVariant = isLive ? 'brand' : isUpcoming ? 'neutral' : 'outline';

    // Format price
    const priceDisplay = (ipo.price !== null && !isNaN(ipo.price)) ? `₹${ipo.price}` : '—';

    // Format GMP
    const gmpDisplay = (ipo.gmp !== null && !isNaN(ipo.gmp))
        ? `${ipo.gmp >= 0 ? '+' : ''}₹${ipo.gmp}`
        : '—';
    const gmpPctDisplay = (ipo.gmpPercent !== null && !isNaN(ipo.gmpPercent))
        ? `(${ipo.gmpPercent >= 0 ? '+' : ''}${ipo.gmpPercent}%)`
        : '';

    // Format dates
    const dateDisplay = [ipo.openDate, ipo.closeDate].filter(Boolean).join(' - ') || 'TBA';

    return (
        <Card hoverEffect className={styles.container}>
            <Link href={`/ipo/${ipo.slug}`} className={styles.link}>
                <div className={styles.contentWrapper}>
                    <div className={styles.header}>
                        <div className={styles.companyInfo}>
                            <div className={styles.logoPlaceholder}>{ipo.name.charAt(0)}</div>
                            <div>
                                <h3 className={styles.name}>{ipo.name}</h3>
                                <p className={styles.dates}>
                                    <Calendar size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                                    {dateDisplay}
                                </p>
                            </div>
                        </div>
                        <div className={styles.badgeStack}>
                            <Badge variant={statusVariant} size="sm">
                                {isLive && <span className={styles.liveDot} />}
                                {ipo.status}
                            </Badge>
                            <Badge variant="outline" size="sm">
                                {ipo.category}
                            </Badge>
                            {revealScore ? (
                                <div
                                    className={styles.scoreBadge}
                                    style={{ background: getScoreGradient(score.overall) }}
                                    title={`${score.label} - ${score.confidence} confidence`}
                                >
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

                    <div className={styles.body}>
                        <div className={styles.priceSection}>
                            <span className={styles.label}>Price</span>
                            <span className={styles.value}>{priceDisplay}</span>
                        </div>

                        <div className={styles.gmpSection}>
                            <span className={styles.label}>GMP</span>
                            <div className={styles.gmpValue}>
                                {gmpPositive
                                    ? <TrendingUp size={14} className={styles[gmpVariant]} />
                                    : gmpNegative
                                        ? <TrendingDown size={14} className={styles[gmpVariant]} />
                                        : null
                                }
                                <span className={styles[gmpVariant]}>
                                    {gmpDisplay} {gmpPctDisplay}
                                </span>
                            </div>
                        </div>

                        {ipo.estListing && (
                            <div className={styles.priceSection}>
                                <span className={styles.label}>Est. Listing</span>
                                <span className={styles.value}>₹{ipo.estListing}</span>
                            </div>
                        )}

                        {ipo.ipoSizeCr && (
                            <div className={styles.priceSection}>
                                <span className={styles.label}>Size</span>
                                <span className={styles.value}>₹{ipo.ipoSizeCr} Cr</span>
                            </div>
                        )}
                    </div>

                    {ipo.subscriptionNum !== null && ipo.subscriptionNum > 0 && (() => {
                        const demand = getSubscriptionDemand(ipo.subscriptionNum);
                        return (
                            <div className={styles.subscription}>
                                <div className={styles.subHeader}>
                                    <span className={styles.label}>Subscription</span>
                                    <span className={styles.subValue}>
                                        {ipo.subscriptionNum}x
                                        <span className={styles.demandTag} style={{ color: demand.color }}>
                                            · {demand.label}
                                        </span>
                                    </span>
                                </div>
                                <ProgressBar
                                    progress={Math.min(ipo.subscriptionNum * 10, 100)}
                                    variant={ipo.subscriptionNum >= 10 ? 'success' : isLive ? 'brand' : 'neutral'}
                                />
                            </div>
                        );
                    })()}

                    {ipo.rating > 0 && (
                        <div className={styles.ratingRow}>
                            {Array.from({ length: ipo.rating }).map((_, i) => (
                                <Flame key={i} size={14} className={styles.fireIcon} />
                            ))}
                        </div>
                    )}

                    <div className={styles.footer}>
                        <div className={styles.footerBtn}>
                            View Details <ArrowUpRight size={16} />
                        </div>
                    </div>
                </div>
            </Link>
        </Card>
    );
};
