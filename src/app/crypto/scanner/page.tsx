'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Shield, AlertTriangle, CheckCircle, XCircle, Search, ExternalLink, Copy, Check } from 'lucide-react';
import type { RugpullResult, SupportedChain } from '@/lib/goplus';
import { CHAIN_LABELS } from '@/lib/goplus';
import styles from './page.module.css';

const CHAINS: SupportedChain[] = ['eth', 'bsc', 'base', 'solana', 'polygon', 'arbitrum'];

const CHAIN_ICONS: Record<string, string> = {
    eth: '⟠',
    bsc: '⬡',
    base: '🔵',
    solana: '◎',
    polygon: '⬟',
    arbitrum: '🔷',
};

const EXAMPLE_ADDRESSES: Record<SupportedChain, string> = {
    eth: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
    bsc: '0xba2ae424d960c26247dd6c32edc70b295c744c43',
    base: '0x4ed4e862860bed51a9570b96d89af5e1b0efefed',
    solana: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    polygon: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    arbitrum: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    avax: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6',
};

function ScoreMeter({ score }: { score: number }) {
    const color = score >= 70 ? '#ef4444' : score >= 45 ? '#f97316' : score >= 20 ? '#eab308' : '#22c55e';
    const label = score >= 70 ? 'RUG' : score >= 45 ? 'DANGER' : score >= 20 ? 'CAUTION' : 'SAFE';

    return (
        <div className={styles.scoreMeter}>
            <div className={styles.scoreCircleContent}>
                <div className={styles.scoreCircle} style={{ '--score-color': color } as any}>
                    <svg viewBox="0 0 120 120" className={styles.scoreRing}>
                        <circle cx="60" cy="60" r="50" className={styles.scoreTrack} />
                        <circle
                            cx="60" cy="60" r="50"
                            className={styles.scoreFill}
                            style={{
                                stroke: color,
                                strokeDasharray: `${(score / 100) * 314} 314`,
                            }}
                        />
                    </svg>
                    <div className={styles.scoreInner}>
                        <span className={styles.scoreNum} style={{ color }}>{score}</span>
                        <span className={styles.scoreLabel} style={{ color }}>{label}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FlagRow({ flag }: { flag: RugpullResult['flags'][0] }) {
    const icon = flag.detected
        ? flag.severity === 'critical' ? <XCircle size={16} className={styles.iconCritical} />
        : flag.severity === 'high' ? <AlertTriangle size={16} className={styles.iconHigh} />
        : <AlertTriangle size={16} className={styles.iconMedium} />
        : <CheckCircle size={16} className={styles.iconSafe} />;

    return (
        <div className={`${styles.flagRow} ${flag.detected ? styles[`flag_${flag.severity}`] : styles.flagSafe}`}>
            {icon}
            <span className={styles.flagLabel}>{flag.label}</span>
            {flag.value && <span className={styles.flagValue}>{flag.value}</span>}
            {!flag.detected && <span className={styles.flagOk}>OK</span>}
        </div>
    );
}

function RugpullChecker() {
    const searchParams = useSearchParams();
    const [address, setAddress] = useState(searchParams.get('address') || '');
    const [chain, setChain] = useState<SupportedChain>((searchParams.get('chain') as SupportedChain) || 'eth');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<RugpullResult | null>(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const preAddress = searchParams.get('address');
        if (preAddress) {
            handleCheck(preAddress, (searchParams.get('chain') as SupportedChain) || 'eth');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleCheck(addr?: string, ch?: SupportedChain) {
        const resolvedAddr = addr || address;
        const resolvedChain = ch || chain;
        if (!resolvedAddr.trim()) return;
        setLoading(true);
        setError('');
        setResult(null);

        try {
            const res = await fetch(`/api/rugpull?address=${encodeURIComponent(resolvedAddr.trim())}&chain=${resolvedChain}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Analysis failed');
            setResult(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    function handleExample() {
        setAddress(EXAMPLE_ADDRESSES[chain] || EXAMPLE_ADDRESSES.eth);
    }

    async function copyShareLink() {
        if (!result) return;
        const url = `${window.location.origin}/rugpull?address=${result.address}&chain=${result.chain}`;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const detectedFlags = result?.flags.filter(f => f.detected) || [];
    const cleanFlags = result?.flags.filter(f => !f.detected) || [];

    return (
        <div className={styles.page}>
            {/* Input */}
            <section className={styles.inputSection}>
                {/* Chain selector */}
                <div className={styles.chainSelector}>
                    {CHAINS.map(c => (
                        <button
                            key={c}
                            className={`${styles.chainBtn} ${chain === c ? styles.chainActive : ''}`}
                            onClick={() => setChain(c)}
                        >
                            <span>{CHAIN_ICONS[c]}</span>
                            <span>{CHAIN_LABELS[c]}</span>
                        </button>
                    ))}
                </div>

                {/* Address input */}
                <div className={styles.inputRow}>
                    <input
                        className={styles.input}
                        type="text"
                        placeholder={`Paste ${CHAIN_LABELS[chain]} contract address...`}
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCheck()}
                    />
                    <button
                        className={styles.checkBtn}
                        onClick={() => handleCheck()}
                        disabled={loading || !address.trim()}
                    >
                        {loading ? (
                            <span className={styles.spinner} />
                        ) : (
                            <>
                                <Search size={18} />
                                Analyze
                            </>
                        )}
                    </button>
                </div>

                <button className={styles.exampleBtn} onClick={handleExample}>
                    Try example ({CHAIN_LABELS[chain]})
                </button>
            </section>

            {/* Error */}
            {error && (
                <div className={styles.errorBox}>
                    <XCircle size={18} />
                    {error}
                </div>
            )}

            {/* Results */}
            {result && (
                <section className={styles.results}>
                    {/* Token header */}
                    <div className={styles.tokenHeader}>
                        <div className={styles.tokenMeta}>
                            <div className={styles.tokenName}>
                                <span className={styles.tokenSymbol}>{result.symbol}</span>
                                <span className={styles.tokenFullName}>{result.name}</span>
                                <span className={styles.tokenChain}>{CHAIN_LABELS[result.chain]}</span>
                            </div>
                            <div className={styles.tokenAddress}>
                                <code>{result.address.slice(0, 8)}...{result.address.slice(-6)}</code>
                                <a
                                    href={`https://dexscreener.com/search?q=${result.address}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.extLink}
                                >
                                    <ExternalLink size={14} />
                                </a>
                            </div>
                        </div>

                        <div className={styles.tokenActions}>
                            <button className={styles.shareBtn} onClick={copyShareLink}>
                                {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Share</>}
                            </button>
                        </div>
                    </div>

                    <div className={styles.resultGrid}>
                        {/* Score */}
                        <div className={styles.scoreCard}>
                            <ScoreMeter score={result.score} />
                            <div className={styles.scoreDesc}>
                                {result.score >= 70 && <p>Multiple critical risks detected. This token shows strong rugpull indicators.</p>}
                                {result.score >= 45 && result.score < 70 && <p>Significant risks detected. Proceed with extreme caution.</p>}
                                {result.score >= 20 && result.score < 45 && <p>Some risks present. DYOR before investing.</p>}
                                {result.score < 20 && <p>No major risks detected. Always do your own research.</p>}
                            </div>
                        </div>

                        {/* Stats */}
                        <div className={styles.statsGrid}>
                            <div className={styles.statBox}>
                                <span className={styles.statLabel}>Holders</span>
                                <span className={styles.statVal}>{result.holders.count.toLocaleString()}</span>
                            </div>
                            <div className={styles.statBox}>
                                <span className={styles.statLabel}>Top 10 Hold</span>
                                <span className={`${styles.statVal} ${result.holders.top10Percent > 60 ? styles.statDanger : ''}`}>
                                    {result.holders.top10Percent.toFixed(1)}%
                                </span>
                            </div>
                            <div className={styles.statBox}>
                                <span className={styles.statLabel}>Buy Tax</span>
                                <span className={`${styles.statVal} ${result.tax.buy > 10 ? styles.statDanger : ''}`}>
                                    {result.tax.buy.toFixed(1)}%
                                </span>
                            </div>
                            <div className={styles.statBox}>
                                <span className={styles.statLabel}>Sell Tax</span>
                                <span className={`${styles.statVal} ${result.tax.sell > 10 ? styles.statDanger : ''}`}>
                                    {result.tax.sell.toFixed(1)}%
                                </span>
                            </div>
                            <div className={styles.statBox}>
                                <span className={styles.statLabel}>Total Liquidity</span>
                                <span className={`${styles.statVal} ${result.dex.reduce((s, d) => s + d.liquidity, 0) < 50000 ? styles.statDanger : ''}`}>
                                    ${result.dex.reduce((s, d) => s + d.liquidity, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                            </div>
                            <div className={styles.statBox}>
                                <span className={styles.statLabel}>DEX Listings</span>
                                <span className={styles.statVal}>{result.dex.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Risk flags */}
                    <div className={styles.flagsSection}>
                        <h2 className={styles.flagsTitle}>Risk Analysis</h2>

                        {detectedFlags.length > 0 && (
                            <div className={styles.flagGroup}>
                                <span className={styles.flagGroupLabel}>Detected Risks ({detectedFlags.length})</span>
                                {detectedFlags
                                    .sort((a, b) => b.points - a.points)
                                    .map(f => <FlagRow key={f.id} flag={f} />)
                                }
                            </div>
                        )}

                        {cleanFlags.length > 0 && (
                            <div className={styles.flagGroup}>
                                <span className={styles.flagGroupLabel}>Passed Checks ({cleanFlags.length})</span>
                                {cleanFlags.map(f => <FlagRow key={f.id} flag={f} />)}
                            </div>
                        )}
                    </div>

                    {/* DEX Listings */}
                    {result.dex.length > 0 && (
                        <div className={styles.dexSection}>
                            <h2 className={styles.flagsTitle}>DEX Listings</h2>
                            <div className={styles.dexList}>
                                {result.dex.map((d, i) => (
                                    <div key={i} className={styles.dexRow}>
                                        <span className={styles.dexName}>{d.name}</span>
                                        <span className={styles.dexLiq}>${d.liquidity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        <a
                                            href={`https://dexscreener.com/search?q=${d.pair}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.extLink}
                                        >
                                            <ExternalLink size={12} />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <p className={styles.disclaimer}>
                        This tool is for informational purposes only. Not financial advice. Always do your own research.
                    </p>
                </section>
            )}

            {/* How it works — shown before first result */}
            {!result && !loading && (
                <section className={styles.howItWorks}>
                    <h2 className={styles.howTitle}>What we check</h2>
                    <div className={styles.checkGrid}>
                        {[
                            { icon: '🍯', title: 'Honeypot Detection', desc: 'Simulates a buy and sell to check if you can actually exit' },
                            { icon: '🖨️', title: 'Mint Function', desc: 'Checks if devs can print unlimited tokens and dump' },
                            { icon: '👑', title: 'Ownership Status', desc: 'Verifies if contract ownership has been renounced' },
                            { icon: '💸', title: 'Tax Analysis', desc: 'Detects hidden buy/sell taxes that drain your trade' },
                            { icon: '🐋', title: 'Whale Concentration', desc: 'Flags if top wallets hold a dangerous % of supply' },
                            { icon: '💧', title: 'Liquidity Check', desc: 'Low liquidity means easy price manipulation' },
                            { icon: '📋', title: 'Contract Verification', desc: 'Unverified contracts hide malicious code' },
                            { icon: '🔒', title: 'Blacklist Function', desc: 'Detects if devs can block specific wallets from selling' },
                        ].map((item, i) => (
                            <div key={i} className={styles.checkCard}>
                                <span className={styles.checkIcon}>{item.icon}</span>
                                <strong className={styles.checkTitle}>{item.title}</strong>
                                <p className={styles.checkDesc}>{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

export default function ScannerPage() {
    return (
        <Suspense fallback={<div style={{ padding: '4rem', textAlign: 'center', color: '#71717a' }}>Loading scanner...</div>}>
            <RugpullChecker />
        </Suspense>
    );
}
