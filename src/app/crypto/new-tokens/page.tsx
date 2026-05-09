'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    Rocket, Shield, AlertTriangle, CheckCircle, XCircle,
    ExternalLink, RefreshCw, TrendingUp, TrendingDown,
    Clock, Zap, Search
} from 'lucide-react';
import styles from './page.module.css';

interface TokenFlag {
    id: string;
    label: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    detected: boolean;
}

interface DexData {
    priceUsd: string;
    volume24h: number;
    priceChange1h: number;
    priceChange24h: number;
    liquidityUsd: number;
    marketCap: number;
    pairUrl: string;
    pairCreatedAt: number;
}

interface NewToken {
    contract_address: string;
    chain: string;
    token_symbol: string;
    token_name: string | null;
    safety_score: number | null;
    verdict: 'SAFE' | 'CAUTION' | 'DANGER' | 'RUG' | null;
    flags: TokenFlag[];
    dex_data: DexData | null;
    profile_url: string;
    icon_url: string | null;
    cached_at: string;
}

const VERDICT_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
    SAFE:    { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   icon: <CheckCircle size={14} /> },
    CAUTION: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: <AlertTriangle size={14} /> },
    DANGER:  { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: <XCircle size={14} /> },
    RUG:     { color: '#dc2626', bg: 'rgba(220,38,38,0.15)',  icon: <XCircle size={14} /> },
};

const CHAIN_LABELS: Record<string, string> = {
    eth: 'ETH', bsc: 'BSC', base: 'Base', solana: 'SOL',
    polygon: 'MATIC', arbitrum: 'ARB', avax: 'AVAX',
};

function fmt(n: number | null | undefined, prefix = '$'): string {
    if (n == null) return '-';
    if (n >= 1e9) return `${prefix}${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `${prefix}${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${prefix}${(n / 1e3).toFixed(0)}K`;
    return `${prefix}${n.toFixed(2)}`;
}

function fmtPrice(p: string | null): string {
    if (!p) return '-';
    const n = parseFloat(p);
    if (n === 0) return '$0';
    if (n < 0.000001) return `$${n.toExponential(2)}`;
    if (n < 0.01) return `$${n.toFixed(6)}`;
    return `$${n.toFixed(4)}`;
}

function timeAgo(ms: number): string {
    const diff = Date.now() - ms;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function ScorePill({ score, verdict }: { score: number | null; verdict: string | null }) {
    if (score == null || !verdict) {
        return <span className={styles.scorePill} style={{ background: 'rgba(255,255,255,0.05)', color: '#71717a' }}>Scanning...</span>;
    }
    const cfg = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.CAUTION;
    return (
        <span className={styles.scorePill} style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.icon} {verdict} {score}/100
        </span>
    );
}

function TokenCard({ token }: { token: NewToken }) {
    const dex = token.dex_data;
    const criticalFlags = token.flags?.filter(f => f.detected && (f.severity === 'critical' || f.severity === 'high')) || [];

    return (
        <div className={`${styles.card} ${token.verdict === 'RUG' || token.verdict === 'DANGER' ? styles.cardDanger : ''}`}>
            <div className={styles.cardHeader}>
                <div className={styles.tokenInfo}>
                    {token.icon_url && (
                        <img src={token.icon_url} alt="" className={styles.tokenIcon} onError={(e) => (e.currentTarget.style.display = 'none')} />
                    )}
                    <div>
                        <span className={styles.tokenSymbol}>${token.token_symbol}</span>
                        {token.token_name && token.token_name !== token.token_symbol && (
                            <span className={styles.tokenName}>{token.token_name}</span>
                        )}
                    </div>
                </div>
                <div className={styles.cardBadges}>
                    <span className={styles.chainBadge}>{CHAIN_LABELS[token.chain] || token.chain}</span>
                    <ScorePill score={token.safety_score} verdict={token.verdict} />
                </div>
            </div>

            {dex && (
                <div className={styles.metrics}>
                    <div className={styles.metric}>
                        <span className={styles.metricLabel}>Price</span>
                        <span className={styles.metricVal}>{fmtPrice(dex.priceUsd)}</span>
                    </div>
                    <div className={styles.metric}>
                        <span className={styles.metricLabel}>Liq</span>
                        <span className={styles.metricVal}>{fmt(dex.liquidityUsd)}</span>
                    </div>
                    <div className={styles.metric}>
                        <span className={styles.metricLabel}>Vol 24h</span>
                        <span className={styles.metricVal}>{fmt(dex.volume24h)}</span>
                    </div>
                    <div className={styles.metric}>
                        <span className={styles.metricLabel}>1h</span>
                        <span className={`${styles.metricVal} ${dex.priceChange1h > 0 ? styles.up : dex.priceChange1h < 0 ? styles.down : ''}`}>
                            {dex.priceChange1h > 0 ? '+' : ''}{dex.priceChange1h?.toFixed(1) ?? '-'}%
                        </span>
                    </div>
                    <div className={styles.metric}>
                        <span className={styles.metricLabel}>Listed</span>
                        <span className={styles.metricVal}>{dex.pairCreatedAt ? timeAgo(dex.pairCreatedAt) : '-'}</span>
                    </div>
                </div>
            )}

            {criticalFlags.length > 0 && (
                <div className={styles.flags}>
                    {criticalFlags.slice(0, 3).map(f => (
                        <span key={f.id} className={`${styles.flag} ${styles[`flag_${f.severity}`]}`}>
                            {f.label}
                        </span>
                    ))}
                    {criticalFlags.length > 3 && (
                        <span className={styles.flagMore}>+{criticalFlags.length - 3} more</span>
                    )}
                </div>
            )}

            <div className={styles.cardActions}>
                <Link href={`/crypto/scanner?address=${token.contract_address}&chain=${token.chain}`} className={styles.btnScan}>
                    <Shield size={13} /> Full Scan
                </Link>
                {dex?.pairUrl && (
                    <a href={dex.pairUrl} target="_blank" rel="noopener noreferrer" className={styles.btnDex}>
                        DEX <ExternalLink size={11} />
                    </a>
                )}
                {token.profile_url && (
                    <a href={token.profile_url} target="_blank" rel="noopener noreferrer" className={styles.btnProfile}>
                        Profile <ExternalLink size={11} />
                    </a>
                )}
            </div>
        </div>
    );
}

type FilterVerdict = 'all' | 'SAFE' | 'CAUTION' | 'DANGER' | 'RUG';

export default function NewTokensPage() {
    const [tokens, setTokens] = useState<NewToken[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterVerdict>('all');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/crypto/new-tokens');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load');
            setTokens(data.tokens || []);
            setLastUpdated(new Date());
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = filter === 'all' ? tokens : tokens.filter(t => t.verdict === filter);
    const counts = {
        all: tokens.length,
        SAFE: tokens.filter(t => t.verdict === 'SAFE').length,
        CAUTION: tokens.filter(t => t.verdict === 'CAUTION').length,
        DANGER: tokens.filter(t => t.verdict === 'DANGER').length,
        RUG: tokens.filter(t => t.verdict === 'RUG').length,
    };

    return (
        <div className={styles.page}>
            <div className={styles.toolbar}>
                <div className={styles.filters}>
                    {(['all', 'SAFE', 'CAUTION', 'DANGER', 'RUG'] as FilterVerdict[]).map(v => (
                        <button
                            key={v}
                            className={`${styles.filterBtn} ${filter === v ? styles.filterActive : ''}`}
                            onClick={() => setFilter(v)}
                            style={filter === v && v !== 'all' ? {
                                borderColor: VERDICT_CONFIG[v]?.color,
                                color: VERDICT_CONFIG[v]?.color,
                            } : undefined}
                        >
                            {v === 'all' ? 'All' : v} <span className={styles.filterCount}>{counts[v]}</span>
                        </button>
                    ))}
                </div>
                <div className={styles.toolbarRight}>
                    {lastUpdated && (
                        <span className={styles.lastUpdated}>
                            <Clock size={12} /> {timeAgo(lastUpdated.getTime())}
                        </span>
                    )}
                    <button className={styles.refreshBtn} onClick={load} disabled={loading}>
                        <RefreshCw size={14} className={loading ? styles.spinning : ''} />
                        {loading ? 'Scanning...' : 'Refresh'}
                    </button>
                </div>
            </div>

                {loading && tokens.length === 0 ? (
                    <div className={styles.loadingState}>
                        <div className={styles.loadingSpinner} />
                        <p>Scanning new launches for risks...</p>
                    </div>
                ) : error ? (
                    <div className={styles.errorState}>
                        <AlertTriangle size={24} />
                        <p>{error}</p>
                        <button onClick={load} className={styles.retryBtn}>Try Again</button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Search size={32} />
                        <p>No {filter === 'all' ? '' : filter} tokens found right now.</p>
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {filtered.map(token => (
                            <TokenCard key={`${token.contract_address}-${token.chain}`} token={token} />
                        ))}
                    </div>
                )}

            <div className={styles.disclaimer}>
                Safety scores are powered by GoPlus Security. Not financial advice. Always DYOR before trading new tokens.
                <Link href="/crypto/scanner"> Run a full scan on any token.</Link>
            </div>
        </div>
    );
}
