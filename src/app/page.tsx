import Link from 'next/link';
import { getAllIPOs } from '@/lib/ipo';
import { getCategoryStats } from '@/lib/ipoAnalytics';
import { getGmpSentiment } from '@/lib/ipoAnalytics';
import { fetchFiiDiiToday } from '@/lib/fiiDii';
import { getTrendingTickers } from '@/lib/social';
import {
    Layers, BarChart3, TrendingUp, Activity, Zap, ArrowRight,
    Users, Building2, Crown, Bell, LineChart, Mail,
    CheckCircle2, ChevronRight, Shield, Clock,
} from 'lucide-react';
import { EmailCapture } from '@/components/marketing/EmailCapture';
import { TickerBanner } from '@/components/marketing/TickerBanner';
import styles from './page.module.css';

export const revalidate = 300;

function JsonLd({ data }: { data: Record<string, unknown> }) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
    );
}

export default async function HomePage() {
    const [allIPOs, fiiDii, trending] = await Promise.all([
        getAllIPOs(),
        fetchFiiDiiToday().catch(() => null),
        getTrendingTickers(8).catch(() => [] as string[]),
    ]);

    const liveIPOs = allIPOs.filter(i => i.status === 'Live');
    const upcomingIPOs = allIPOs.filter(i => i.status === 'Upcoming');
    const stats = getCategoryStats(allIPOs);

    const topGmp = allIPOs
        .filter(i => i.gmpPercent !== null && i.gmpPercent > 0)
        .sort((a, b) => (b.gmpPercent ?? 0) - (a.gmpPercent ?? 0))
        .slice(0, 5);

    const websiteSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Staqq',
        url: 'https://staqq.in',
        description: "India's first unified market intelligence platform. IPO GMP tracking, FII/DII flows, insider trades, and live Solana token alerts.",
        publisher: { '@type': 'Organization', name: 'Staqq', url: 'https://staqq.in' },
        potentialAction: {
            '@type': 'SearchAction',
            target: 'https://staqq.in/stocks/{search_term}',
            'query-input': 'required name=search_term',
        },
    };

    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            {
                '@type': 'Question',
                name: 'What is IPO GMP (Grey Market Premium)?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'IPO GMP is the premium at which IPO shares trade in the unofficial grey market before listing. A positive GMP indicates market expects the IPO to list above issue price. Staqq tracks live GMP for all Indian IPOs with sentiment scoring.',
                },
            },
            {
                '@type': 'Question',
                name: 'How to check FII DII data today?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Staqq provides real-time FII and DII buy/sell data from NSE. Check the Intel page for daily institutional flow data updated after market hours.',
                },
            },
            {
                '@type': 'Question',
                name: 'How to calculate IPO allotment probability?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: "IPO allotment probability depends on the subscription multiple. Use Staqq's Allotment Calculator for exact estimates with multi-application strategies.",
                },
            },
        ],
    };

    return (
        <main className={styles.main}>
            <JsonLd data={websiteSchema} />
            <JsonLd data={faqSchema} />

            {/* ── 1. Hero ── */}
            <section className={styles.hero}>
                <div className={styles.heroGlowLime} aria-hidden="true" />
                <div className={styles.heroGlowViolet} aria-hidden="true" />

                <div className={styles.heroFloating} aria-hidden="true">
                    {/* FII Net Buy */}
                    <div className={`${styles.heroBadgeFloat} ${styles.heroBadge1}`}>
                        <div className={styles.badgeRow}>
                            <div className={`${styles.badgeIcon} ${styles.badgeIconLime}`}>
                                <TrendingUp size={14} />
                            </div>
                            <span className={`${styles.badgeLiveChip} ${styles.badgeLiveChipGreen}`}>
                                <span className={styles.heroBadgeDotPulse2} style={{ background: '#22c55e' }} />
                                LIVE
                            </span>
                        </div>
                        <div className={styles.badgeTitle}>FII Net Activity</div>
                        <div className={`${styles.badgeValue} ${styles.badgeValueGreen}`}>₹2,400 Cr</div>
                        <div className={styles.badgeSub}>Net buy today · NSE data</div>
                    </div>

                    {/* Live IPOs */}
                    <div className={`${styles.heroBadgeFloat} ${styles.heroBadge2}`}>
                        <div className={styles.badgeRow}>
                            <div className={`${styles.badgeIcon} ${styles.badgeIconLime}`}>
                                <Zap size={14} />
                            </div>
                            <span className={`${styles.badgeLiveChip} ${styles.badgeLiveChipLime}`}>
                                <span className={styles.heroBadgeDotPulse2} style={{ background: '#caff00' }} />
                                {liveIPOs.length} OPEN
                            </span>
                        </div>
                        <div className={styles.badgeTitle}>IPO Tracker</div>
                        <div className={styles.badgeValue}>{upcomingIPOs.length} <span className={styles.badgeValueSub}>upcoming</span></div>
                        <div className={styles.badgeSub}>Mainboard + SME · Updated 5 min</div>
                    </div>

                    {/* GMP Signal */}
                    <div className={`${styles.heroBadgeFloat} ${styles.heroBadge3}`}>
                        <div className={styles.badgeRow}>
                            <div className={`${styles.badgeIcon} ${styles.badgeIconLime}`}>
                                <BarChart3 size={14} />
                            </div>
                            <span className={`${styles.badgeLiveChip} ${styles.badgeLiveChipLime}`}>BULLISH</span>
                        </div>
                        <div className={styles.badgeTitle}>Grey Market Premium</div>
                        <div className={`${styles.badgeValue} ${styles.badgeValueLime}`}>+24% <span className={styles.badgeValueSub}>avg</span></div>
                        <div className={styles.badgeSub}>Across live IPOs · GMP sentiment</div>
                    </div>

                    {/* Insider Activity */}
                    <div className={`${styles.heroBadgeFloat} ${styles.heroBadge4}`}>
                        <div className={styles.badgeRow}>
                            <div className={`${styles.badgeIcon} ${styles.badgeIconViolet}`}>
                                <Building2 size={14} />
                            </div>
                            <span className={`${styles.badgeLiveChip} ${styles.badgeLiveChipViolet}`}>TODAY</span>
                        </div>
                        <div className={styles.badgeTitle}>Insider Trades</div>
                        <div className={`${styles.badgeValue} ${styles.badgeValueViolet}`}>12 <span className={styles.badgeValueSub}>buys filed</span></div>
                        <div className={styles.badgeSub}>NSE PIT disclosures · SEBI</div>
                    </div>
                </div>

                <div className="container">
                    <div className={styles.heroContent}>
                        <div className={styles.heroPill}>
                            <span className={styles.heroPillDot} />
                            India&apos;s first equity and crypto intelligence suite
                        </div>
                        <h1 className={styles.heroTitle}>
                            <span className={styles.heroTitleLine1}>The Data Behind</span>
                            <span className={styles.heroTitleLine2}>Every Big Move.</span>
                        </h1>
                        <p className={styles.heroSubtitle}>
                            IPO GMP, FII/DII flows, insider trades, bulk deals, and on-chain crypto intelligence   all in one place, built for investors who want an edge.
                        </p>
                        <div className={styles.heroActions}>
                            <Link href="/ipo" className={styles.primaryBtn}>
                                Start for Free
                            </Link>
                            <Link href="/signals" className={styles.outlineBtn}>
                                See Live Data <ChevronRight size={16} />
                            </Link>
                        </div>

                        {trending.length > 0 && (
                            <div className={styles.trendingContainer}>
                                <span className={styles.trendingLabel}>
                                    <Activity size={14} /> Trending:
                                </span>
                                <div className={styles.trendingList}>
                                    {trending.map(ticker => (
                                        <Link key={ticker} href={`/stocks/${ticker}`} className={styles.trendingItem}>
                                            {ticker}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ── 2. Stats Bar ── */}
            <section className={styles.statsSection}>
                <div className="container">
                    <div className={styles.statsGrid}>
                        <div className={styles.stat}>
                            <span className={styles.statNum}>₹2.4L<span className={styles.statUnit}> Cr</span></span>
                            <span className={styles.statLabel}>FII + DII Flows Tracked</span>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.stat}>
                            <span className={styles.statNum}>500<span className={styles.statPlus}>+</span></span>
                            <span className={styles.statLabel}>NSE Stocks Covered</span>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.stat}>
                            <span className={styles.statNum}>250<span className={styles.statPlus}>+</span></span>
                            <span className={styles.statLabel}>IPOs Analyzed</span>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.stat}>
                            <span className={`${styles.statNum} ${styles.statNumViolet}`}>13<span className={styles.statUnit}> checks</span></span>
                            <span className={styles.statLabel}>Token Risk Checks</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 2b. Ticker Banner ── */}
            <TickerBanner />

            {/* ── 3. Two Products ── */}
            <section className={styles.productsSection}>
                <div className="container">
                    <div className={styles.sectionEyebrow}>What we do</div>
                    <h2 className={styles.sectionTitle}>Two products. One platform.</h2>
                    <p className={styles.sectionSubtitle}>
                        Indian equity intelligence and Solana alpha, built for the investor who wants it all.
                    </p>
                    <div className={styles.productsGrid}>
                        <div className={styles.productCard}>
                            <div className={styles.productCardGlow} />
                            <div className={styles.productTag}>Indian Equity</div>
                            <h3 className={styles.productTitle}>Every signal that moves Indian markets.</h3>
                            <p className={styles.productDesc}>
                                From IPO GMP to institutional flows and insider disclosures   all the data serious investors track, in one place.
                            </p>
                            <ul className={styles.productFeatures}>
                                {[
                                    'Live IPO GMP with sentiment scoring',
                                    'Allotment probability calculator',
                                    'FII/DII institutional flow tracker',
                                    'NSE insider trade & bulk deal scanner',
                                    'NIFTY 500 stock screener',
                                    'Social buzz & Reddit sentiment feed',
                                ].map(f => (
                                    <li key={f}>
                                        <CheckCircle2 size={15} className={styles.checkLime} />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <Link href="/ipo" className={styles.productCta}>
                                Explore Dashboard <ArrowRight size={15} />
                            </Link>
                        </div>

                        <div className={`${styles.productCard} ${styles.productCardViolet}`}>
                            <div className={`${styles.productCardGlow} ${styles.productCardGlowViolet}`} />
                            <div className={`${styles.productTag} ${styles.productTagViolet}`}>Crypto Suite</div>
                            <h3 className={styles.productTitle}>On-chain intelligence, built for early movers.</h3>
                            <p className={styles.productDesc}>
                                Scan tokens for rug risk, track smart wallets, and catch new launches before the crowd   across 6 chains.
                            </p>
                            <ul className={styles.productFeatures}>
                                {[
                                    'Token rugpull scanner across 6 chains',
                                    'Honeypot, LP lock & tax analysis',
                                    'Smart wallet tracker (ETH + Solana)',
                                    'New token launches, pre-filtered for safety',
                                    'Social signal feed for trending tokens',
                                    'Solana Telegram alerts   coming soon',
                                ].map(f => (
                                    <li key={f}>
                                        <CheckCircle2 size={15} className={styles.checkViolet} />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <Link href="/crypto" className={`${styles.productCta} ${styles.productCtaViolet}`}>
                                Explore Crypto Suite <ArrowRight size={15} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 4. Indian Equity Features ── */}
            <section className={styles.featuresSection}>
                <div className="container">
                    <div className={styles.sectionEyebrow}>Indian Equity</div>
                    <h2 className={styles.sectionTitle}>Everything the market is doing, right now.</h2>
                    <div className={styles.featuresGrid}>
                        <Link href="/ipo" className={styles.featureCard}>
                            <div className={styles.featureIcon}><Layers size={22} /></div>
                            <h3>IPO Hub</h3>
                            <p>Live Grey Market Premium with sentiment scoring, mainboard and SME IPO tracking, subscription multiples, and an allotment probability calculator.</p>
                            <span className={styles.featureArrow}><ArrowRight size={14} /></span>
                        </Link>
                        <Link href="/signals/fii-dii" className={styles.featureCard}>
                            <div className={styles.featureIcon}><BarChart3 size={22} /></div>
                            <h3>FII / DII Flows</h3>
                            <p>Daily net buy/sell data from NSE for Foreign and Domestic Institutional Investors. Updated every evening after market close.</p>
                            <span className={styles.featureArrow}><ArrowRight size={14} /></span>
                        </Link>
                        <Link href="/signals/insider-trades" className={styles.featureCard}>
                            <div className={styles.featureIcon}><Building2 size={22} /></div>
                            <h3>Insider Trades</h3>
                            <p>Promoter, director, and KMP disclosures directly from NSE&apos;s PIT filings. Last 14 days of insider activity across all listed companies.</p>
                            <span className={styles.featureArrow}><ArrowRight size={14} /></span>
                        </Link>
                        <Link href="/signals/bulk-deals" className={styles.featureCard}>
                            <div className={styles.featureIcon}><TrendingUp size={22} /></div>
                            <h3>Bulk &amp; Block Deals</h3>
                            <p>Institutional deals above 0.5% of company equity, sourced from NSE intraday data. See client names, prices, and deal size as they happen.</p>
                            <span className={styles.featureArrow}><ArrowRight size={14} /></span>
                        </Link>
                        <Link href="/stocks/screener" className={styles.featureCard}>
                            <div className={styles.featureIcon}><LineChart size={22} /></div>
                            <h3>Stock Screener</h3>
                            <p>Filter the full NIFTY 500 universe by price, market cap, sector, P/E, and 1-year returns. Includes top gainers, losers, volume shockers, and 52-week breakouts.</p>
                            <span className={styles.featureArrow}><ArrowRight size={14} /></span>
                        </Link>
                        <Link href="/signals" className={styles.featureCard}>
                            <div className={styles.featureIcon}><Activity size={22} /></div>
                            <h3>Social Buzz</h3>
                            <p>Live aggregation of Reddit discussions from Indian stock subreddits and financial news from LiveMint and BusinessLine. Detects mention spikes in real time.</p>
                            <span className={styles.featureArrow}><ArrowRight size={14} /></span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── 5. Solana Bot Section ── */}
            <section className={styles.solanaSection}>
                <div className={styles.solanaGlow} aria-hidden="true" />
                <div className="container">
                    <div className={styles.solanaInner}>
                        <div className={styles.solanaContent}>
                            <div className={`${styles.sectionEyebrow} ${styles.sectionEyebrowViolet}`}>Coming Soon   Solana Alerts</div>
                            <h2 className={styles.sectionTitle}>The bot that never sleeps.</h2>
                            <p className={styles.sectionSubtitle}>
                                Hundreds of new Solana tokens launch every hour. Most are traps.
                                We&apos;re building @StaqqBot to scan every new pair, score it for safety, and send you only the ones worth a second look   straight to Telegram.
                            </p>
                            <div className={styles.solanaSteps}>
                                <div className={styles.solanaStep}>
                                    <span className={styles.solanaStepNum}>01</span>
                                    <div>
                                        <strong>Detect</strong>
                                        <p>Every new pair on Raydium and Pump.fun picked up within seconds of creation</p>
                                    </div>
                                </div>
                                <div className={styles.solanaStep}>
                                    <span className={styles.solanaStepNum}>02</span>
                                    <div>
                                        <strong>Score</strong>
                                        <p>Liquidity depth, holder distribution, contract flags, and social presence   all checked before an alert fires</p>
                                    </div>
                                </div>
                                <div className={styles.solanaStep}>
                                    <span className={styles.solanaStepNum}>03</span>
                                    <div>
                                        <strong>Alert</strong>
                                        <p>Clean, one-tap Telegram alert with everything you need to decide fast</p>
                                    </div>
                                </div>
                            </div>
                            <Link href="/alerts" className={styles.solanaBtn}>
                                Join the Waitlist <ArrowRight size={16} />
                            </Link>
                        </div>

                        <div className={styles.telegramMock}>
                            <div className={styles.telegramHeader}>
                                <div className={styles.telegramAvatar}>S</div>
                                <div className={styles.telegramHeaderInfo}>
                                    <strong>StaqqBot</strong>
                                    <span>just now</span>
                                </div>
                                <span className={styles.telegramOnline} />
                            </div>
                            <div className={styles.telegramMsg}>
                                <div className={styles.telegramAlertBadge}>
                                    <span className={styles.telegramDot} />
                                    NEW TOKEN ALERT
                                </div>
                                <div className={styles.telegramToken}>$EXAMPLE</div>
                                <div className={styles.telegramGrid}>
                                    <div className={styles.telegramStat}>
                                        <span>Price</span>
                                        <strong>$0.000042</strong>
                                    </div>
                                    <div className={styles.telegramStat}>
                                        <span>Liquidity</span>
                                        <strong>$48,000</strong>
                                    </div>
                                    <div className={styles.telegramStat}>
                                        <span>Safety Score</span>
                                        <strong className={styles.telegramGreen}>8.4 / 10</strong>
                                    </div>
                                    <div className={styles.telegramStat}>
                                        <span>24h</span>
                                        <strong className={styles.telegramGreen}>+340%</strong>
                                    </div>
                                </div>
                                <div className={styles.telegramChecks}>
                                    <span><Shield size={11} /> Contract verified</span>
                                    <span><Users size={11} /> 420 holders</span>
                                    <span><Clock size={11} /> 4 min old</span>
                                </div>
                                <div className={styles.telegramCta}>View on Dexscreener →</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 6. Live Market Data ── */}
            <section className={styles.pulseSection}>
                <div className="container">
                    <div className={styles.sectionEyebrow}>Live Data</div>
                    <h2 className={styles.sectionTitle}>The market, right now.</h2>
                    <div className={styles.pulseGrid}>
                        <div className={styles.pulseCard}>
                            <div className={styles.pulseHeader}>
                                <Zap size={16} className={styles.pulseIcon} />
                                <span>IPO Activity</span>
                            </div>
                            <div className={styles.pulseStats}>
                                <div className={styles.pulseStat}>
                                    <span className={styles.pulseNum}>{liveIPOs.length}</span>
                                    <span className={styles.pulseLabel}>Live</span>
                                </div>
                                <div className={styles.pulseStat}>
                                    <span className={styles.pulseNum}>{upcomingIPOs.length}</span>
                                    <span className={styles.pulseLabel}>Upcoming</span>
                                </div>
                                <div className={styles.pulseStat}>
                                    <span className={styles.pulseNum}>{stats.total}</span>
                                    <span className={styles.pulseLabel}>Tracked</span>
                                </div>
                            </div>
                            <Link href="/ipo" className={styles.pulseLink}>
                                View all IPOs <ArrowRight size={14} />
                            </Link>
                        </div>

                        <div className={styles.pulseCard}>
                            <div className={styles.pulseHeader}>
                                <BarChart3 size={16} className={styles.pulseIcon} />
                                <span>FII/DII Flows</span>
                            </div>
                            {fiiDii ? (
                                <>
                                    <div className={styles.pulseStats}>
                                        <div className={styles.pulseStat}>
                                            <span className={styles.pulseNum} style={{ color: fiiDii.fii.net >= 0 ? '#22c55e' : '#ef4444', fontSize: '1.2rem' }}>
                                                {fiiDii.fii.net >= 0 ? '+' : ''}₹{Math.abs(fiiDii.fii.net).toLocaleString('en-IN')} Cr
                                            </span>
                                            <span className={styles.pulseLabel}>FII Net</span>
                                        </div>
                                        <div className={styles.pulseStat}>
                                            <span className={styles.pulseNum} style={{ color: fiiDii.dii.net >= 0 ? '#22c55e' : '#ef4444', fontSize: '1.2rem' }}>
                                                {fiiDii.dii.net >= 0 ? '+' : ''}₹{Math.abs(fiiDii.dii.net).toLocaleString('en-IN')} Cr
                                            </span>
                                            <span className={styles.pulseLabel}>DII Net</span>
                                        </div>
                                    </div>
                                    <Link href="/signals/fii-dii" className={styles.pulseLink}>
                                        Full breakdown <ArrowRight size={14} />
                                    </Link>
                                </>
                            ) : (
                                <p className={styles.pulseEmpty}>Available after market hours</p>
                            )}
                        </div>

                        <div className={styles.pulseCard}>
                            <div className={styles.pulseHeader}>
                                <Activity size={16} className={styles.pulseIcon} />
                                <span>Social Sentiment</span>
                            </div>
                            <div className={styles.pulseStats}>
                                <div className={styles.pulseStat}>
                                    <span className={styles.pulseNum}>{trending.length}</span>
                                    <span className={styles.pulseLabel}>Trending</span>
                                </div>
                                <div className={styles.pulseStat}>
                                    <span className={styles.pulseNum}>Daily</span>
                                    <span className={styles.pulseLabel}>Updated</span>
                                </div>
                            </div>
                            <Link href="/signals" className={styles.pulseLink}>
                                View signals <ArrowRight size={14} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 7. Top GMP IPOs ── */}
            {topGmp.length > 0 && (
                <section className={styles.topSection}>
                    <div className="container">
                        <div className={styles.sectionHead}>
                            <h2>Top GMP IPOs Right Now</h2>
                            <Link href="/ipo" className={styles.seeAll}>See all <ArrowRight size={14} /></Link>
                        </div>
                        <div className={styles.ipoGrid}>
                            {topGmp.map(ipo => {
                                const sentiment = getGmpSentiment(ipo.gmpPercent);
                                return (
                                    <Link key={ipo.slug} href={`/ipo/${ipo.slug}`} className={styles.ipoCard}>
                                        <div className={styles.ipoCardTop}>
                                            <span className={styles.ipoName}>{ipo.name}</span>
                                            <span className={styles.ipoBadge} style={{ color: sentiment.color, background: `${sentiment.color}18` }}>
                                                {ipo.status}
                                            </span>
                                        </div>
                                        <div className={styles.ipoGmp} style={{ color: sentiment.color }}>
                                            +{ipo.gmpPercent}%
                                        </div>
                                        <div className={styles.ipoMeta}>
                                            {ipo.price && <span>₹{ipo.price}</span>}
                                            {ipo.subscription && <span>{ipo.subscription} subscribed</span>}
                                            <span>{ipo.category}</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* ── 8. Pro Upgrade ── */}
            <section className={styles.proSection}>
                <div className="container">
                    <div className={styles.proContent}>
                        <div className={styles.proBadge}>
                            <Crown size={14} /> Staqq Pro
                        </div>
                        <h2 className={styles.proTitle}>Get the edge serious investors use.</h2>
                        <p className={styles.proSubtitle}>
                            Unlock real-time signals, composite IPO scores, custom alert rules, and daily morning briefs. Starting at just ₹499/mo.
                        </p>
                        <div className={styles.proFeatures}>
                            <div className={styles.proFeature}>
                                <LineChart size={20} />
                                <div>
                                    <strong>Composite IPO Score</strong>
                                    <span>One number (1-10) combining GMP, subscription, quality, and size</span>
                                </div>
                            </div>
                            <div className={styles.proFeature}>
                                <Bell size={20} />
                                <div>
                                    <strong>Custom Alert Rules</strong>
                                    <span>Set conditions like &quot;FII sells &gt; ₹5,000 Cr&quot; and get notified instantly</span>
                                </div>
                            </div>
                            <div className={styles.proFeature}>
                                <Mail size={20} />
                                <div>
                                    <strong>Morning Market Brief</strong>
                                    <span>Daily email with GMP changes, top signals, and FII/DII summary</span>
                                </div>
                            </div>
                            <div className={styles.proFeature}>
                                <Zap size={20} />
                                <div>
                                    <strong>Real-Time Signals</strong>
                                    <span>Zero delay on social spikes, insider trades, and bulk deals</span>
                                </div>
                            </div>
                        </div>
                        <div className={styles.proActions}>
                            <Link href="/pricing" className={styles.primaryBtn}>View Pricing</Link>
                            <span className={styles.proNote}>Cancel anytime. UPI, cards, netbanking accepted.</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 9. Bottom CTA ── */}
            <section className={styles.ctaSection}>
                <div className={styles.ctaGlow} aria-hidden="true" />
                <div className="container">
                    <div className={styles.ctaInner}>
                        <h2 className={styles.ctaTitle}>
                            Stop piecing together<br />
                            <span className={styles.ctaTitleAccent}>10 different tabs.</span>
                        </h2>
                        <p className={styles.ctaSubtitle}>
                            GMP, FII flows, insider trades, bulk deals, crypto scanner   it&apos;s all here. Free to start.
                        </p>
                        <div className={styles.ctaActions}>
                            <Link href="/signup" className={styles.primaryBtn}>Create Free Account</Link>
                            <Link href="/ipo" className={styles.outlineBtn}>Explore the Dashboard</Link>
                        </div>
                        <p className={styles.ctaNote}>No credit card required. Free forever on the base plan.</p>
                    </div>
                </div>
            </section>

            {/* ── 11. Email Capture ── */}
            <section className={styles.emailSection}>
                <div className="container">
                    <EmailCapture />
                </div>
            </section>

            {/* ── 11. SEO ── */}
            <section className={styles.seoSection}>
                <div className="container">
                    <h2>Why Staqq?</h2>
                    <div className={styles.seoGrid}>
                        <div>
                            <h3>Real-Time IPO GMP Tracking</h3>
                            <p>
                                Staqq tracks Grey Market Premium for every upcoming, live, and recently listed IPO in India.
                                We provide GMP sentiment scoring that translates raw numbers into actionable signals so you
                                know exactly where market sentiment stands.
                            </p>
                        </div>
                        <div>
                            <h3>Alternative Data Signals</h3>
                            <p>
                                Go beyond price charts. Staqq aggregates social media discussions from r/IndianStockMarket,
                                r/IndianStreetBets, and FinTwit, detects mention spikes, and overlays institutional data
                                like FII/DII flows and insider trades.
                            </p>
                        </div>
                        <div>
                            <h3>Built for Indian Markets</h3>
                            <p>
                                Every feature is built specifically for NSE and BSE. From IPO subscription data to
                                SEBI insider disclosures, from bulk deal tracking to SME IPO analysis   the intelligence
                                platform Indian investors have been waiting for.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
