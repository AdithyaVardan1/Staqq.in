'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
    Wallet, Search, X, ExternalLink, Clock, Shield,
    ArrowUpRight, TrendingUp, TrendingDown, AlertCircle,
    RefreshCw, Plus, Trash2, Zap, LogIn, Crown
} from 'lucide-react';
import type { WalletBuy } from '@/lib/wallet-tracker';
import { createBrowserClient } from '@supabase/ssr';
import styles from './page.module.css';

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Helpers ─────────────────────────────────────────────────────────

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function fmt(n: number | null, prefix = '$') {
    if (n === null || n === undefined) return '-';
    if (n < 0.0001) return `${prefix}${n.toExponential(2)}`;
    if (n < 1) return `${prefix}${n.toFixed(6)}`;
    if (n >= 1e9) return `${prefix}${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `${prefix}${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${prefix}${(n / 1e3).toFixed(0)}K`;
    return `${prefix}${n.toFixed(4)}`;
}

function shortAddr(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function detectChainClient(address: string): 'eth' | 'solana' | null {
    if (/^0x[0-9a-fA-F]{40}$/.test(address)) return 'eth';
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return 'solana';
    return null;
}

const CHAIN_LABELS: Record<string, string> = {
    eth: 'ETH', bsc: 'BSC', solana: 'SOL', base: 'Base',
};

const LS_KEY = 'wallet_tracker_v1';

interface SavedWallet {
    wallet_address: string;
    label: string | null;
    chain: string;
    created_at: string;
}

// ─── Buy card ─────────────────────────────────────────────────────────

function BuyCard({ buy }: { buy: WalletBuy }) {
    const ch1 = buy.priceChange1h;
    const ch24 = buy.priceChange24h;
    const explorerUrl = buy.chain === 'eth'
        ? `https://etherscan.io/tx/${buy.txHash}`
        : buy.chain === 'bsc'
        ? `https://bscscan.com/tx/${buy.txHash}`
        : `https://solscan.io/tx/${buy.txHash}`;

    return (
        <div className={styles.card}>
            <div className={styles.cardTop}>
                <div className={styles.tokenBadge}>
                    <Zap size={12} className={styles.buyIcon} />
                    <strong className={styles.tokenSymbol}>${buy.tokenSymbol}</strong>
                    {buy.tokenName !== buy.tokenSymbol && (
                        <span className={styles.tokenName}>{buy.tokenName}</span>
                    )}
                </div>
                <span className={styles.chainBadge}>{CHAIN_LABELS[buy.chain] || buy.chain}</span>
            </div>

            <div className={styles.stats}>
                <div className={styles.stat}>
                    <span className={styles.statLabel}>Price</span>
                    <span className={styles.statVal}>{fmt(buy.priceUsd)}</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statLabel}>1h</span>
                    <span className={`${styles.statVal} ${ch1 !== null && ch1 > 0 ? styles.up : ch1 !== null && ch1 < 0 ? styles.down : ''}`}>
                        {ch1 !== null
                            ? <>{ch1 > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {ch1 > 0 ? '+' : ''}{ch1.toFixed(2)}%</>
                            : '-'}
                    </span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statLabel}>24h</span>
                    <span className={`${styles.statVal} ${ch24 !== null && ch24 > 0 ? styles.up : ch24 !== null && ch24 < 0 ? styles.down : ''}`}>
                        {ch24 !== null ? `${ch24 > 0 ? '+' : ''}${ch24.toFixed(2)}%` : '-'}
                    </span>
                </div>
            </div>

            <div className={styles.cardFooter}>
                <span className={styles.time}><Clock size={11} />{timeAgo(buy.timestamp)}</span>
                <div className={styles.footerLinks}>
                    <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
                        Tx <ExternalLink size={10} />
                    </a>
                    {buy.dexUrl && (
                        <a href={buy.dexUrl} target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
                            DEX <ArrowUpRight size={10} />
                        </a>
                    )}
                    {buy.tokenAddress && buy.chain !== 'solana' && (
                        <Link href={`/crypto/scanner?address=${buy.tokenAddress}&chain=${buy.chain}`} className={styles.footerLink}>
                            <Shield size={10} /> Scan
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Wallet panel ─────────────────────────────────────────────────────

function WalletPanel({ wallet, onRemove }: { wallet: SavedWallet; onRemove: () => void }) {
    const [buys, setBuys] = useState<WalletBuy[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/crypto/wallets?address=${wallet.wallet_address}&chain=${wallet.chain}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setBuys(data.buys || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [wallet.wallet_address, wallet.chain]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className={styles.walletPanel}>
            <div className={styles.panelHeader}>
                <div className={styles.panelTitle}>
                    <Wallet size={15} />
                    <span className={styles.panelLabel}>{wallet.label || shortAddr(wallet.wallet_address)}</span>
                    <span className={styles.panelAddr}>{shortAddr(wallet.wallet_address)}</span>
                    <span className={`${styles.chainPill} ${styles[`chain_${wallet.chain}`]}`}>
                        {CHAIN_LABELS[wallet.chain] || wallet.chain}
                    </span>
                </div>
                <div className={styles.panelActions}>
                    <button className={styles.iconBtn} onClick={load} title="Refresh">
                        <RefreshCw size={13} className={loading ? styles.spinning : ''} />
                    </button>
                    <button className={styles.iconBtn} onClick={onRemove} title="Remove wallet">
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className={styles.panelLoading}>
                    {[1, 2, 3].map(i => <div key={i} className={styles.skeleton} />)}
                    {wallet.chain === 'solana' && (
                        <p className={styles.solanaNote}>Parsing Solana transactions... this takes ~15s</p>
                    )}
                </div>
            ) : error ? (
                <div className={styles.panelError}><AlertCircle size={14} /> {error}</div>
            ) : buys.length === 0 ? (
                <div className={styles.panelEmpty}>No token buys found in the last 30 days.</div>
            ) : (
                <>
                    <p className={styles.panelCount}>{buys.length} token buys in last 30 days</p>
                    <div className={styles.grid}>
                        {buys.map(buy => <BuyCard key={buy.id} buy={buy} />)}
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────

export default function WalletTrackerPage() {
    const [wallets, setWallets] = useState<SavedWallet[]>([]);
    const [input, setInput] = useState('');
    const [labelInput, setLabelInput] = useState('');
    const [inputError, setInputError] = useState('');
    const [detectedChain, setDetectedChain] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [limitHit, setLimitHit] = useState(false);

    // Load user + wallets
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user);
            setAuthLoading(false);
        });
    }, []);

    useEffect(() => {
        if (authLoading) return;
        if (user) {
            fetch('/api/crypto/watchlist')
                .then(r => r.json())
                .then(data => setWallets(data.wallets || []));
        } else {
            try {
                const saved = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
                // Normalize from old format
                const normalized: SavedWallet[] = saved.map((w: any) => ({
                    wallet_address: w.wallet_address || w.address,
                    label: w.label || null,
                    chain: w.chain,
                    created_at: w.created_at || w.addedAt || new Date().toISOString(),
                }));
                setWallets(normalized);
            } catch { setWallets([]); }
        }
    }, [user, authLoading]);

    function handleAddressChange(val: string) {
        setInput(val);
        setInputError('');
        setLimitHit(false);
        setDetectedChain(detectChainClient(val.trim()));
    }

    async function addWallet() {
        const addr = input.trim();
        if (!addr) return;
        const chain = detectChainClient(addr);
        if (!chain) {
            setInputError('Invalid address. Expected 0x... (ETH/BSC) or base58 (Solana).');
            return;
        }
        if (wallets.some(w => w.wallet_address.toLowerCase() === addr.toLowerCase())) {
            setInputError('Already tracking this wallet.');
            return;
        }

        const newWallet: SavedWallet = {
            wallet_address: addr,
            label: labelInput.trim() || null,
            chain,
            created_at: new Date().toISOString(),
        };

        if (user) {
            const res = await fetch('/api/crypto/watchlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wallet_address: addr, chain, label: labelInput.trim() || null }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.limitHit) { setLimitHit(true); return; }
                setInputError(data.error || 'Failed to save.');
                return;
            }
            setWallets(prev => [data.wallet, ...prev]);
        } else {
            if (wallets.length >= 3) {
                setLimitHit(true);
                return;
            }
            const updated = [newWallet, ...wallets];
            setWallets(updated);
            localStorage.setItem(LS_KEY, JSON.stringify(updated));
        }

        setInput('');
        setLabelInput('');
        setDetectedChain(null);
    }

    async function removeWallet(address: string) {
        if (user) {
            await fetch('/api/crypto/watchlist', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wallet_address: address }),
            });
        } else {
            const updated = wallets.filter(w => w.wallet_address !== address);
            localStorage.setItem(LS_KEY, JSON.stringify(updated));
        }
        setWallets(prev => prev.filter(w => w.wallet_address !== address));
        setLimitHit(false);
    }

    return (
        <div className={styles.page}>
            {!user && !authLoading && (
                <Link href="/login" className={styles.signInBanner}>
                    <LogIn size={14} /> Sign in to save wallets across devices and get email alerts
                </Link>
            )}

            <div className={styles.inputSection}>
                <div className={styles.inputRow}>
                    <div className={styles.inputWrap}>
                        <Search size={15} className={styles.inputIcon} />
                        <input
                            className={styles.addressInput}
                            placeholder="Paste wallet address (0x... ETH/BSC, base58 Solana)"
                            value={input}
                            onChange={e => handleAddressChange(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addWallet()}
                            spellCheck={false}
                        />
                        {input && (
                            <button className={styles.clearBtn} onClick={() => { setInput(''); setDetectedChain(null); setInputError(''); }}>
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    <input
                        className={styles.labelInput}
                        placeholder="Label (optional)"
                        value={labelInput}
                        onChange={e => setLabelInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addWallet()}
                    />
                    <button className={styles.addBtn} onClick={addWallet} disabled={!input.trim()}>
                        <Plus size={15} /> Track
                    </button>
                </div>

                {detectedChain && !inputError && (
                    <p className={styles.chainDetected}>
                        Detected: <strong>{CHAIN_LABELS[detectedChain] || detectedChain}</strong> address
                        {detectedChain === 'eth' && ' (also works for BSC tokens)'}
                    </p>
                )}
                {inputError && <p className={styles.inputErrorMsg}><AlertCircle size={12} /> {inputError}</p>}

                {limitHit && (
                    <div className={styles.limitBanner}>
                        <Crown size={14} />
                        {user
                            ? <>Free plan: 5 wallet limit. <Link href="/pricing">Upgrade to Pro</Link> for unlimited wallets + email alerts when they buy.</>
                            : <>Guest limit: 3 wallets. <Link href="/signup">Create a free account</Link> for 5 wallets, or <Link href="/pricing">go Pro</Link> for unlimited + alerts.</>
                        }
                    </div>
                )}
            </div>

            {wallets.length === 0 ? (
                <div className={styles.empty}>
                    <Wallet size={40} className={styles.emptyIcon} />
                    <h3>No wallets tracked yet</h3>
                    <p>Paste any ETH or Solana wallet address above to start tracking its token buys.</p>
                    <div className={styles.examples}>
                        <p className={styles.examplesLabel}>Try these wallets:</p>
                        <div className={styles.exampleChips}>
                            <span className={styles.exampleChip} onClick={() => handleAddressChange('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')}>
                                Vitalik.eth
                            </span>
                            <span className={styles.exampleChip} onClick={() => handleAddressChange('0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5')}>
                                MEV Whale
                            </span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={styles.panels}>
                    {wallets.map(w => (
                        <WalletPanel
                            key={w.wallet_address}
                            wallet={w}
                            onRemove={() => removeWallet(w.wallet_address)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
