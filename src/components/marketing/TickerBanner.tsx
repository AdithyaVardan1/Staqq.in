import styles from './TickerBanner.module.css';

const NSE_TICKERS = [
    { t: 'RELIANCE',   c: '+1.2%',  up: true  },
    { t: 'TCS',        c: '-0.8%',  up: false },
    { t: 'INFY',       c: '+0.4%',  up: true  },
    { t: 'HDFCBANK',   c: '+2.1%',  up: true  },
    { t: 'ICICIBANK',  c: '+0.9%',  up: true  },
    { t: 'BAJFINANCE', c: '-1.4%',  up: false },
    { t: 'WIPRO',      c: '+0.3%',  up: true  },
    { t: 'SUNPHARMA',  c: '+5.2%',  up: true  },
    { t: 'TATAMOTORS', c: '+1.8%',  up: true  },
    { t: 'SBIN',       c: '-0.5%',  up: false },
    { t: 'ITC',        c: '+0.7%',  up: true  },
    { t: 'ONGC',       c: '+2.3%',  up: true  },
    { t: 'KOTAKBANK',  c: '-0.2%',  up: false },
    { t: 'MARUTI',     c: '+1.5%',  up: true  },
    { t: 'HCLTECH',    c: '+0.6%',  up: true  },
    { t: 'ASIANPAINT', c: '-1.1%',  up: false },
    { t: 'JSWSTEEL',   c: '+3.4%',  up: true  },
    { t: 'HINDUNILVR', c: '-0.3%',  up: false },
    { t: 'ADANIPORTS', c: '+2.8%',  up: true  },
    { t: 'LTIM',       c: '+1.0%',  up: true  },
];

const CRYPTO_ITEMS = [
    { t: 'BTC',    p: '$65,200', c: '+2.1%',  up: true,  crypto: true },
    { t: 'ETH',    p: '$3,100',  c: '-0.6%',  up: false, crypto: true },
    { t: 'SOL',    p: '$142',    c: '+4.8%',  up: true,  crypto: true },
    { t: 'BNB',    p: '$580',    c: '+0.9%',  up: true,  crypto: true },
    { t: 'MATIC',  p: '$0.85',   c: '-1.2%',  up: false, crypto: true },
    { t: 'AVAX',   p: '$38',     c: '+3.2%',  up: true,  crypto: true },
    { t: 'LINK',   p: '$14.2',   c: '+1.7%',  up: true,  crypto: true },
    { t: 'ARB',    p: '$1.12',   c: '-2.3%',  up: false, crypto: true },
    { t: 'OP',     p: '$2.40',   c: '+5.6%',  up: true,  crypto: true },
    { t: 'INJ',    p: '$28.4',   c: '+7.1%',  up: true,  crypto: true },
    { t: 'DOGE',   p: '$0.162',  c: '+1.4%',  up: true,  crypto: true },
    { t: 'XRP',    p: '$0.52',   c: '-0.8%',  up: false, crypto: true },
];

const FEATURE_BADGES = [
    { label: 'IPO GMP Live',     accent: 'lime' },
    { label: 'FII/DII Flows',    accent: 'lime' },
    { label: 'Insider Trades',   accent: 'lime' },
    { label: 'Bulk Deals',       accent: 'lime' },
    { label: 'Token Scanner',    accent: 'violet' },
    { label: 'Smart Wallets',    accent: 'violet' },
    { label: 'Solana Alerts',    accent: 'violet' },
    { label: '500+ NSE Stocks',  accent: 'lime' },
];

// Interleave crypto + feature badges for row 2
function buildRow2() {
    const out: Array<{ kind: 'crypto'; t: string; p: string; c: string; up: boolean } | { kind: 'badge'; label: string; accent: string }> = [];
    let ci = 0, fi = 0;
    while (ci < CRYPTO_ITEMS.length || fi < FEATURE_BADGES.length) {
        if (ci < CRYPTO_ITEMS.length) {
            const { t, p, c, up } = CRYPTO_ITEMS[ci++];
            out.push({ kind: 'crypto', t, p, c, up });
        }
        if (ci < CRYPTO_ITEMS.length) {
            const { t, p, c, up } = CRYPTO_ITEMS[ci++];
            out.push({ kind: 'crypto', t, p, c, up });
        }
        if (fi < FEATURE_BADGES.length) {
            out.push({ kind: 'badge', ...FEATURE_BADGES[fi++] });
        }
    }
    return out;
}

const row2 = buildRow2();

export function TickerBanner() {
    return (
        <div className={styles.banner} aria-hidden="true">
            {/* Row 1   NSE stocks, scroll left */}
            <div className={styles.row}>
                <div className={styles.track}>
                    {[...NSE_TICKERS, ...NSE_TICKERS].map((item, i) => (
                        <span key={i} className={styles.stockChip}>
                            <span className={`${styles.dot} ${item.up ? styles.dotGreen : styles.dotRed}`} />
                            <span className={styles.chipTicker}>{item.t}</span>
                            <span className={`${styles.chipChange} ${item.up ? styles.changeUp : styles.changeDown}`}>
                                {item.c}
                            </span>
                        </span>
                    ))}
                </div>
            </div>

            {/* Row 2   Crypto + feature badges, scroll right */}
            <div className={`${styles.row} ${styles.rowReverse}`}>
                <div className={`${styles.track} ${styles.trackReverse}`}>
                    {[...row2, ...row2].map((item, i) => {
                        if (item.kind === 'badge') {
                            return (
                                <span key={i} className={`${styles.featureBadge} ${item.accent === 'violet' ? styles.featureBadgeViolet : ''}`}>
                                    {item.label}
                                </span>
                            );
                        }
                        return (
                            <span key={i} className={`${styles.stockChip} ${styles.cryptoChip}`}>
                                <span className={`${styles.dot} ${item.up ? styles.dotGreen : styles.dotRed}`} />
                                <span className={styles.chipTicker}>{item.t}</span>
                                <span className={styles.chipPrice}>{item.p}</span>
                                <span className={`${styles.chipChange} ${item.up ? styles.changeUp : styles.changeDown}`}>
                                    {item.c}
                                </span>
                            </span>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
