'use client';

import React, { useState } from 'react';
import { Check, X, Crown, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Script from 'next/script';
import { useSubscription } from '@/hooks/useSubscription';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { BETA_UNLOCK_ALL } from '@/lib/beta';
import styles from './page.module.css';

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const FREE_FEATURES = [
    { text: 'Basic IPO tracker (live, upcoming, listed)', included: true },
    { text: '5 stock lookups per day', included: true },
    { text: 'Delayed signals (30-min lag)', included: true },
    { text: 'Basic screener filters', included: true },
    { text: '3 alert subscriptions', included: true },
    { text: 'Composite IPO Score', included: false },
    { text: 'Custom alert rules', included: false },
    { text: 'Morning market brief', included: false },
    { text: 'PDF & Excel export', included: false },
];

const PRO_FEATURES = [
    { text: 'Everything in Free', included: true, highlight: true },
    { text: 'Unlimited stock lookups', included: true },
    { text: 'Real-time signals (no delay)', included: true },
    { text: 'Advanced screener + all filters', included: true },
    { text: 'Unlimited alert subscriptions', included: true },
    { text: 'Composite IPO Score (1-10)', included: true },
    { text: 'Custom alert rules engine', included: true },
    { text: 'Daily morning market brief', included: true },
    { text: 'Export to PDF & Excel', included: true },
    { text: 'Ad-free experience', included: true },
];

const FAQ = [
    {
        q: 'Can I try Pro before paying?',
        a: 'The free tier gives you a genuine taste of the platform. When you upgrade, you get immediate access to all Pro features. Cancel anytime.',
    },
    {
        q: 'What payment methods are accepted?',
        a: 'We accept UPI, credit/debit cards, netbanking, and wallets through Razorpay, India\'s most trusted payment gateway.',
    },
    {
        q: 'Can I cancel anytime?',
        a: 'Yes. Cancel anytime from your profile. You\'ll keep Pro access until the end of your billing period. No questions asked.',
    },
    {
        q: 'Is my payment information secure?',
        a: 'Absolutely. Payments are handled entirely by Razorpay (PCI-DSS compliant). We never store your card or bank details.',
    },
    {
        q: 'What is the Composite IPO Score?',
        a: 'It\'s a proprietary 1-10 score combining GMP, subscription multiples, sector sentiment, company quality, and issue size to give you one number to decide if an IPO is worth applying to.',
    },
    {
        q: 'How do custom alert rules work?',
        a: 'You set conditions like "Alert me when FII sells more than ₹5,000 Cr" or "Alert me when any Nifty 50 stock spikes on social media." We evaluate these every 15 minutes and notify you instantly.',
    },
];

export default function PricingPage() {
    const [isYearly, setIsYearly] = useState(false);
    const [loading, setLoading] = useState(false);
    const { isPro } = useSubscription();
    const router = useRouter();

    const monthlyPrice = 499;
    const yearlyPrice = 4999;
    const displayPrice = isYearly ? yearlyPrice : monthlyPrice;
    const period = isYearly ? '/year' : '/month';

    const handleSubscribe = async () => {
        setLoading(true);
        try {
            // Check auth
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login?redirectedFrom=/pricing');
                return;
            }

            const planId = isYearly ? 'pro_yearly' : 'pro_monthly';

            // Create subscription on server
            const res = await fetch('/api/billing/create-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId }),
            });

            if (!res.ok) {
                const data = await res.json();
                if (res.status === 409) {
                    alert('You already have an active Pro subscription!');
                    return;
                }
                throw new Error(data.error || 'Failed to create subscription');
            }

            const { subscriptionId, key } = await res.json();

            // Open Razorpay Checkout
            const options = {
                key,
                subscription_id: subscriptionId,
                name: 'Staqq',
                description: `Staqq Pro ${isYearly ? 'Yearly' : 'Monthly'}`,
                theme: {
                    color: '#CAFF00',
                    backdrop_color: '#0A0A0A',
                },
                handler: () => {
                    // Payment successful   webhook will update DB
                    router.push('/profile?upgraded=true');
                },
                modal: {
                    ondismiss: () => {
                        setLoading(false);
                    },
                },
                prefill: {
                    email: user.email,
                    name: user.user_metadata?.full_name || '',
                },
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (error: any) {
            console.error('[Pricing] Error:', error.message);
            alert('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className={styles.main}>
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

            <div className="container">
                {/* Hero */}
                <section className={styles.hero}>
                    {BETA_UNLOCK_ALL && (
                        <div className={styles.betaBanner}>
                            🎉 Everything&apos;s free during our beta   every Pro feature is unlocked, no payment needed.
                        </div>
                    )}
                    <h1 className={styles.heroTitle}>
                        Unlock the full <span>terminal</span>
                    </h1>
                    <p className={styles.heroSubtitle}>
                        Get real-time alternative data signals, composite IPO scores,
                        custom alert rules, and a daily morning brief. Everything serious
                        investors need.
                    </p>

                    {/* Toggle */}
                    <div className={styles.toggleWrapper}>
                        <span className={`${styles.toggleLabel} ${!isYearly ? styles.toggleLabelActive : ''}`}>
                            Monthly
                        </span>
                        <button
                            className={styles.toggle}
                            data-active={isYearly}
                            onClick={() => setIsYearly(!isYearly)}
                            aria-label="Toggle yearly pricing"
                        >
                            <div className={styles.toggleDot} />
                        </button>
                        <span className={`${styles.toggleLabel} ${isYearly ? styles.toggleLabelActive : ''}`}>
                            Yearly
                        </span>
                        {isYearly && <span className={styles.saveBadge}>Save 17%</span>}
                    </div>
                </section>

                {/* Plans */}
                <div className={styles.plansGrid}>
                    {/* Free Plan */}
                    <div className={styles.planCard}>
                        <h2 className={styles.planName}>Free</h2>
                        <div className={styles.planPrice}>
                            <span className={styles.priceAmount}>₹0</span>
                            <span className={styles.pricePeriod}>/forever</span>
                        </div>
                        <p className={styles.planDescription}>
                            Get started with essential IPO tracking and market signals.
                        </p>
                        <ul className={styles.featureList}>
                            {FREE_FEATURES.map(({ text, included }) => (
                                <li key={text} className={styles.feature}>
                                    {included ? (
                                        <Check size={16} color="#22C55E" className={styles.featureIcon} />
                                    ) : (
                                        <X size={16} color="#52525B" className={styles.featureIcon} />
                                    )}
                                    <span style={{ color: included ? undefined : '#52525B' }}>{text}</span>
                                </li>
                            ))}
                        </ul>
                        <Link href="/ipo" className={`${styles.planCta} ${styles.ctaFree}`}>
                            Get Started Free
                        </Link>
                    </div>

                    {/* Pro Plan */}
                    <div className={`${styles.planCard} ${styles.planCardPro}`}>
                        <div className={styles.popularTag}>Most Popular</div>
                        <h2 className={styles.planName}>
                            Pro <Crown size={18} color="#CAFF00" style={{ display: 'inline', verticalAlign: 'middle' }} />
                        </h2>
                        <div className={styles.planPrice}>
                            <span className={styles.priceAmount}>₹{displayPrice.toLocaleString('en-IN')}</span>
                            <span className={styles.pricePeriod}>{period}</span>
                        </div>
                        <p className={styles.planDescription}>
                            {isYearly
                                ? `That's just ₹${Math.round(yearlyPrice / 12)}/month. Full terminal access.`
                                : 'Full alternative data terminal for serious investors.'}
                        </p>
                        <ul className={styles.featureList}>
                            {PRO_FEATURES.map(({ text, highlight }) => (
                                <li key={text} className={`${styles.feature} ${highlight ? styles.featureHighlight : ''}`}>
                                    <Check size={16} color="#CAFF00" className={styles.featureIcon} />
                                    <span>{text}</span>
                                </li>
                            ))}
                        </ul>
                        {BETA_UNLOCK_ALL ? (
                            <Link href="/ipo" className={`${styles.planCta} ${styles.ctaFree}`}>
                                Free during beta   explore now
                            </Link>
                        ) : isPro ? (
                            <div className={`${styles.planCta} ${styles.ctaFree}`}>
                                You&apos;re on Pro
                            </div>
                        ) : (
                            <button
                                onClick={handleSubscribe}
                                disabled={loading}
                                className={`${styles.planCta} ${styles.ctaPro}`}
                            >
                                {loading ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Crown size={18} />
                                )}
                                {loading ? 'Processing...' : 'Start Pro Now'}
                            </button>
                        )}
                    </div>
                </div>

                {/* FAQ */}
                <section className={styles.faqSection}>
                    <h2 className={styles.faqTitle}>Frequently Asked Questions</h2>
                    {FAQ.map(({ q, a }) => (
                        <div key={q} className={styles.faqItem}>
                            <h3 className={styles.faqQuestion}>{q}</h3>
                            <p className={styles.faqAnswer}>{a}</p>
                        </div>
                    ))}
                </section>
            </div>
        </main>
    );
}
