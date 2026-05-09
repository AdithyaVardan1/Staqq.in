'use client';

import Link from 'next/link';
import { Zap, Shield, Clock, Lock, CheckCircle, ArrowRight, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { BotWaitlistForm } from './BotWaitlistForm';
import styles from './page.module.css';

const steps = [
    {
        num: '01',
        title: 'New pair detected',
        desc: 'Every new token pair on Raydium and Pump.fun is caught the moment it goes live on-chain.',
    },
    {
        num: '02',
        title: 'Multi-layer safety analysis',
        desc: 'Each token passes through our scoring system before an alert is ever sent. Most tokens never make it through.',
    },
    {
        num: '03',
        title: 'Alert fires to Telegram',
        desc: 'Staqq Score (0-100) attached to every alert. You get the signal within 60 seconds. No account needed beyond your Telegram.',
    },
];

const features = [
    {
        icon: Zap,
        title: 'Quality over noise',
        desc: '5-15 curated alerts per day. Most bots send 200+. We filter hard so you do not have to sort through garbage.',
    },
    {
        icon: Clock,
        title: '60-second latency',
        desc: 'From pair creation on-chain to your Telegram in under a minute. Every time.',
    },
    {
        icon: Shield,
        title: 'Proprietary rug filter',
        desc: 'Multi-factor safety analysis runs on every token before it reaches you. The exact criteria are what make it hard to game.',
    },
    {
        icon: Lock,
        title: 'Privacy first',
        desc: 'Only your Telegram ID is stored. No wallet address, no email, no account. Built as a direct response to the Axiom scandal.',
    },
];

const tiers = [
    {
        name: 'Free',
        price: '$0',
        period: 'forever',
        perks: ['5 alerts per day', 'Real-time delivery', 'Staqq Score on every alert', 'No wallet or email needed'],
        highlight: false,
    },
    {
        name: 'Pro',
        price: '$9',
        period: 'per month',
        perks: ['Unlimited alerts', 'Priority alert queue', 'Full score breakdown per token', 'Pay with USDC or card'],
        highlight: true,
    },
];

const PROOF = [
    { num: '60s', label: 'Detection Speed' },
    { num: '94%', label: 'Rug Filter Rate' },
    { num: '6', label: 'Chains Covered' },
    { num: '5-15', label: 'Alerts / Day' },
];

const fadeUp = (delay = 0): any => ({
    initial: { opacity: 0, y: 28, filter: 'blur(8px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 0.85, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
});

const stagger: any = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const childVariant: any = {
    hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
    show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }
};

export default function AlertsPage() {
    return (
        <main className={styles.page}>
            {/* Ambient orbs */}
            <div className={styles.orb1} aria-hidden />
            <div className={styles.orb2} aria-hidden />
            <div className={styles.orb3} aria-hidden />

            {/* ── Hero ── */}
            <section className={styles.hero}>
                <div className={styles.heroRing} aria-hidden />
                <div className={styles.heroRing2} aria-hidden />

                <motion.div {...fadeUp(0)}>
                    <div className={styles.badge}>
                        <span className={styles.badgeDot} />
                        Launching soon · Alpha access open
                    </div>
                </motion.div>

                <motion.h1 className={styles.title} {...fadeUp(0.1)}>
                    Solana Alpha.<br />
                    <span className={styles.accent}>Delivered.</span>
                </motion.h1>

                <motion.p className={styles.subtitle} {...fadeUp(0.2)}>
                    Real-time Solana new token pair alerts with multi-layer rug scoring,
                    fired to your Telegram within 60 seconds of pair creation.
                </motion.p>

                <motion.div {...fadeUp(0.3)}>
                    <a
                        href="https://t.me/StaqqBot"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.ctaBtn}
                    >
                        <Send size={16} />
                        Follow @StaqqBot on Telegram
                    </a>
                    <p className={styles.heroNote}>
                        No account. No wallet. Just your Telegram.
                    </p>
                </motion.div>
            </section>

            {/* ── Live Proof Bar ── */}
            <motion.div
                className={styles.proofBar}
                {...fadeUp(0.4)}
            >
                {PROOF.map((p, i) => (
                    <>
                        <div key={p.label} className={styles.proofItem} style={{ animationDelay: `${i * 0.08 + 0.5}s` }}>
                            <span className={styles.proofNum}>{p.num}</span>
                            <span className={styles.proofLabel}>{p.label}</span>
                        </div>
                        {i < PROOF.length - 1 && <div key={`d-${i}`} className={styles.proofDivider} />}
                    </>
                ))}
            </motion.div>

            <div className={styles.wrap}>

                {/* ── How it works ── */}
                <motion.section
                    className={styles.section}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: '-80px' }}
                    variants={stagger}
                >
                    <motion.div variants={childVariant} className={styles.eyebrow}>HOW IT WORKS</motion.div>
                    <motion.h2 variants={childVariant} className={styles.sectionTitle}>Three steps. Sixty seconds.</motion.h2>
                    <motion.div variants={stagger} className={styles.steps}>
                        {steps.map((step) => (
                            <motion.div key={step.num} variants={childVariant} className={styles.step}>
                                <div className={styles.stepNum}>{step.num}</div>
                                <div>
                                    <div className={styles.stepTitle}>{step.title}</div>
                                    <div className={styles.stepDesc}>{step.desc}</div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.section>

                {/* ── Features ── */}
                <motion.section
                    className={styles.section}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: '-80px' }}
                    variants={stagger}
                >
                    <motion.div variants={childVariant} className={styles.eyebrow}>WHY STAQQ ALERTS</motion.div>
                    <motion.h2 variants={childVariant} className={styles.sectionTitle}>Built different from day one</motion.h2>
                    <motion.div variants={stagger} className={styles.featureGrid}>
                        {features.map((f) => (
                            <motion.div key={f.title} variants={childVariant} className={styles.featureCard}>
                                <div className={styles.featureIconWrap}>
                                    <f.icon size={20} />
                                </div>
                                <div className={styles.featureTitle}>{f.title}</div>
                                <div className={styles.featureDesc}>{f.desc}</div>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.section>

                {/* ── Pricing ── */}
                <motion.section
                    className={styles.section}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: '-80px' }}
                    variants={stagger}
                >
                    <motion.div variants={childVariant} className={styles.eyebrow}>PRICING</motion.div>
                    <motion.h2 variants={childVariant} className={styles.sectionTitle}>Simple. No gotchas.</motion.h2>
                    <motion.div variants={stagger} className={styles.pricingGrid}>
                        {tiers.map((tier) => (
                            <motion.div
                                key={tier.name}
                                variants={childVariant}
                                className={`${styles.pricingCard} ${tier.highlight ? styles.pricingCardPro : ''}`}
                            >
                                {tier.highlight && <div className={styles.proBadge}>Most popular</div>}
                                <div className={styles.tierName}>{tier.name}</div>
                                <div className={styles.tierPrice}>
                                    {tier.price}
                                    <span className={styles.tierPeriod}> / {tier.period}</span>
                                </div>
                                <ul className={styles.perkList}>
                                    {tier.perks.map((perk) => (
                                        <li key={perk} className={styles.perk}>
                                            <CheckCircle size={14} className={styles.perkIcon} />
                                            {perk}
                                        </li>
                                    ))}
                                </ul>
                                <a
                                    href="https://t.me/StaqqBot"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={tier.highlight ? styles.ctaBtn : styles.ctaBtnOutline}
                                >
                                    Get notified at launch
                                    <ArrowRight size={14} />
                                </a>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.section>

                {/* ── Waitlist ── */}
                <motion.section
                    className={styles.waitlistSection}
                    initial={{ opacity: 0, y: 32, filter: 'blur(10px)' }}
                    whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                >
                    <div className={styles.eyebrow}>EARLY ACCESS</div>
                    <h2 className={styles.sectionTitle}>Get in before launch</h2>
                    <BotWaitlistForm />
                </motion.section>

                {/* ── Bottom note ── */}
                <motion.div
                    className={styles.bottomNote}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.2 }}
                >
                    <p>
                        Also on Staqq:{' '}
                        <Link href="/ipo" className={styles.inlineLink}>Indian IPO GMP</Link>,{' '}
                        <Link href="/signals/fii-dii" className={styles.inlineLink}>FII/DII flows</Link>,{' '}
                        <Link href="/stocks/screener" className={styles.inlineLink}>stock screener</Link>.
                    </p>
                </motion.div>

            </div>
        </main>
    );
}
