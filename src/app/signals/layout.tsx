import React from 'react';
import { SignalNav } from '@/components/signals/SignalNav';
import { IntelPageShell } from '@/components/signals/IntelPageShell';
import styles from './layout.module.css';

export default function SignalsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className={styles.layout}>
            {/* Ambient background glows */}
            <div className={styles.heroGlowLime} aria-hidden="true" />
            <div className={styles.heroGlowViolet} aria-hidden="true" />

            <div className={styles.container}>
                <IntelPageShell
                    header={
                        <div className={styles.pageHeader}>
                            <div className={styles.headerLeft}>
                                <div className={styles.headerBadge}>
                                    <span className={styles.badgeDot} />
                                    Market Intelligence
                                </div>
                                <h1 className={styles.title}>
                                    Signals that move
                                    <br />
                                    <span className={styles.accent}>before the market does.</span>
                                </h1>
                                <p className={styles.subtitle}>
                                    Real-time news, social buzz, FII/DII flows, and insider activity   all in one place.
                                </p>
                            </div>

                            <div className={styles.headerRight}>
                                <div className={styles.statChip}>
                                    <span className={styles.statDot} style={{ background: '#f59e0b' }} />
                                    <span className={styles.statNum}>Live</span>
                                    <span className={styles.statLabel}>Market Feed</span>
                                </div>
                                <div className={styles.statChip}>
                                    <span className={styles.statDot} style={{ background: '#a78bfa' }} />
                                    <span className={styles.statNum}>AI</span>
                                    <span className={styles.statLabel}>Social Synthesis</span>
                                </div>
                                <div className={styles.statChip}>
                                    <span className={styles.statDot} style={{ background: '#38bdf8' }} />
                                    <span className={styles.statNum}>4</span>
                                    <span className={styles.statLabel}>Signal Types</span>
                                </div>
                            </div>
                        </div>
                    }
                    nav={
                        <div className={styles.navWrapper}>
                            <SignalNav />
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
