import React from 'react';
import { CryptoNav } from '@/components/crypto/CryptoNav';
import { IntelPageShell } from '@/components/signals/IntelPageShell';
import styles from './layout.module.css';

export default function CryptoLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className={styles.layout}>
            {/* Ambient purple glows */}
            <div className={styles.heroGlowViolet1} aria-hidden="true" />
            <div className={styles.heroGlowViolet2} aria-hidden="true" />

            <div className={styles.container}>
                <IntelPageShell
                    header={
                        <div className={styles.pageHeader}>
                            <div className={styles.headerLeft}>
                                <div className={styles.headerBadge}>
                                    <span className={styles.badgeDot} />
                                    Crypto Suite
                                </div>
                                <h1 className={styles.title}>
                                    Find gems. Avoid rugs.
                                    <br />
                                    <span className={styles.accent}>Copy smart money.</span>
                                </h1>
                                <p className={styles.subtitle}>
                                    Social signals, wallet intelligence, safety scanning, and new launch discovery — all in one place.
                                </p>
                            </div>

                            <div className={styles.headerRight}>
                                <div className={styles.statChip}>
                                    <span className={styles.statDot} style={{ background: '#22c55e' }} />
                                    <span className={styles.statNum}>Live</span>
                                    <span className={styles.statLabel}>Social Feed</span>
                                </div>
                                <div className={styles.statChip}>
                                    <span className={styles.statDot} style={{ background: '#a855f7' }} />
                                    <span className={styles.statNum}>12K+</span>
                                    <span className={styles.statLabel}>Wallets Tracked</span>
                                </div>
                                <div className={styles.statChip}>
                                    <span className={styles.statDot} style={{ background: '#38bdf8' }} />
                                    <span className={styles.statNum}>94%</span>
                                    <span className={styles.statLabel}>Rug Detection</span>
                                </div>
                            </div>
                        </div>
                    }
                    nav={
                        <div className={styles.navWrapper}>
                            <CryptoNav />
                        </div>
                    }
                >
                    <div className={styles.content}>
                        {children}
                    </div>
                </IntelPageShell>
            </div>
        </div>
    );
}
