'use client';

import React, { useRef, useCallback } from 'react';
import { Share2, Download, Link2 } from 'lucide-react';
import styles from './ShareableCard.module.css';

interface StatItem {
    label: string;
    value: string;
    color?: string;
}

interface ShareableCardProps {
    title: string;
    subtitle?: string;
    bigValue?: string;
    bigValueColor?: string;
    bigLabel?: string;
    badge?: { text: string; color: string; bg: string };
    stats?: StatItem[];
    glowColor?: string;
    shareUrl?: string;
    shareText?: string;
}

export default function ShareableCard({
    title,
    subtitle,
    bigValue,
    bigValueColor = '#fff',
    bigLabel,
    badge,
    stats,
    glowColor = 'rgba(99,102,241,0.3)',
    shareUrl,
    shareText,
}: ShareableCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);

    const handleShare = useCallback(async () => {
        const text = shareText || `${title}${bigValue ? `   ${bigValue}` : ''} | Staqq`;
        const url = shareUrl || window.location.href;

        if (navigator.share) {
            try {
                await navigator.share({ title: 'Staqq', text, url });
            } catch {}
        } else {
            await navigator.clipboard.writeText(`${text}\n${url}`);
            alert('Copied to clipboard!');
        }
    }, [title, bigValue, shareText, shareUrl]);

    const handleCopyLink = useCallback(async () => {
        const url = shareUrl || window.location.href;
        await navigator.clipboard.writeText(url);
        alert('Link copied!');
    }, [shareUrl]);

    const today = new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    return (
        <div className={styles.cardWrapper}>
            <div className={styles.card} ref={cardRef}>
                {/* Glow effect */}
                <div
                    className={styles.glow}
                    style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }}
                />

                {/* Header */}
                <div className={styles.cardHeader}>
                    <div className={styles.brandMark}>
                        <div className={styles.brandIcon}>S</div>
                        <span className={styles.brandName}>staqq</span>
                    </div>
                    {badge && (
                        <span
                            className={styles.badge}
                            style={{ color: badge.color, background: badge.bg }}
                        >
                            {badge.text}
                        </span>
                    )}
                </div>

                {/* Content */}
                <h2 className={styles.cardTitle}>{title}</h2>
                {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}

                {bigValue && (
                    <>
                        <div className={styles.bigValue} style={{ color: bigValueColor }}>
                            {bigValue}
                        </div>
                        {bigLabel && <div className={styles.bigLabel}>{bigLabel}</div>}
                    </>
                )}

                {/* Stats */}
                {stats && stats.length > 0 && (
                    <div className={styles.statsRow}>
                        {stats.map((stat) => (
                            <div key={stat.label} className={styles.stat}>
                                <div className={styles.statLabel}>{stat.label}</div>
                                <div
                                    className={styles.statValue}
                                    style={stat.color ? { color: stat.color } : undefined}
                                >
                                    {stat.value}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div className={styles.cardFooter}>
                    <span className={styles.footerUrl}>staqq.in</span>
                    <span className={styles.footerDate}>{today}</span>
                </div>
            </div>

            {/* Share actions (outside the screenshot area) */}
            <div className={styles.shareActions}>
                <button className={styles.shareBtn} onClick={handleShare}>
                    <Share2 size={14} /> Share
                </button>
                <button className={styles.shareBtn} onClick={handleCopyLink}>
                    <Link2 size={14} /> Copy Link
                </button>
            </div>
        </div>
    );
}
