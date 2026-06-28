// ─── IPO Analytics Engine ─────────────────────────────────────────────
// GMP accuracy scoring, performance analytics, and allotment probability.
// Works with existing IPOData from the InvestorGain scraper.
// ──────────────────────────────────────────────────────────────────────

import type { IPOData } from './ipo';

// ─── Types ──────────────────────────────────────────────────────────

export interface IPOPerformanceRecord {
    name: string;
    slug: string;
    category: 'IPO' | 'SME';
    issuePrice: number;
    gmpAmount: number | null;
    gmpPercent: number | null;
    estListing: number | null;
    listingDate: string | null;
    subscription: string | null;
    subscriptionNum: number | null;
    rating: number;
}

export interface CategoryStats {
    category: 'IPO' | 'SME' | 'All';
    total: number;
    withGmp: number;
    positiveGmp: number;
    negativeGmp: number;
    avgGmpPercent: number;
    avgSubscription: number;
    highestGmp: { name: string; gmpPercent: number } | null;
    lowestGmp: { name: string; gmpPercent: number } | null;
    mostSubscribed: { name: string; subscriptionNum: number } | null;
}

export interface GmpAccuracyStats {
    totalTracked: number;
    avgGmpPercent: number;
    positiveGmpCount: number;
    negativeGmpCount: number;
    neutralCount: number;
    gmpDistribution: { range: string; count: number }[];
}

export interface AllotmentEstimate {
    category: string;
    applicationType: string;
    avgSubscription: number;
    estimatedProbability: number;
    sampleSize: number;
}

// ─── Performance Analytics ──────────────────────────────────────────

export function getPerformanceRecords(ipos: IPOData[]): IPOPerformanceRecord[] {
    return ipos
        .filter(ipo => ipo.price !== null && ipo.price > 0)
        .map(ipo => ({
            name: ipo.name,
            slug: ipo.slug,
            category: ipo.category,
            issuePrice: ipo.price!,
            gmpAmount: ipo.gmp,
            gmpPercent: ipo.gmpPercent,
            estListing: ipo.estListing,
            listingDate: ipo.listingDate,
            subscription: ipo.subscription,
            subscriptionNum: ipo.subscriptionNum,
            rating: ipo.rating,
        }));
}

export function getCategoryStats(ipos: IPOData[], category?: 'IPO' | 'SME'): CategoryStats {
    const filtered = category ? ipos.filter(i => i.category === category) : ipos;
    const withGmp = filtered.filter(i => i.gmpPercent !== null);
    const positiveGmp = withGmp.filter(i => (i.gmpPercent ?? 0) > 0);
    const negativeGmp = withGmp.filter(i => (i.gmpPercent ?? 0) < 0);
    const withSub = filtered.filter(i => i.subscriptionNum !== null && i.subscriptionNum > 0);

    const avgGmpPercent = withGmp.length > 0
        ? withGmp.reduce((sum, i) => sum + (i.gmpPercent ?? 0), 0) / withGmp.length
        : 0;

    const avgSubscription = withSub.length > 0
        ? withSub.reduce((sum, i) => sum + (i.subscriptionNum ?? 0), 0) / withSub.length
        : 0;

    // Find extremes
    const sortedByGmp = [...withGmp].sort((a, b) => (b.gmpPercent ?? 0) - (a.gmpPercent ?? 0));
    const sortedBySub = [...withSub].sort((a, b) => (b.subscriptionNum ?? 0) - (a.subscriptionNum ?? 0));

    return {
        category: category ?? 'All',
        total: filtered.length,
        withGmp: withGmp.length,
        positiveGmp: positiveGmp.length,
        negativeGmp: negativeGmp.length,
        avgGmpPercent: Math.round(avgGmpPercent * 100) / 100,
        avgSubscription: Math.round(avgSubscription * 100) / 100,
        highestGmp: sortedByGmp[0] ? { name: sortedByGmp[0].name, gmpPercent: sortedByGmp[0].gmpPercent! } : null,
        lowestGmp: sortedByGmp.length > 0 ? { name: sortedByGmp[sortedByGmp.length - 1].name, gmpPercent: sortedByGmp[sortedByGmp.length - 1].gmpPercent! } : null,
        mostSubscribed: sortedBySub[0] ? { name: sortedBySub[0].name, subscriptionNum: sortedBySub[0].subscriptionNum! } : null,
    };
}

// ─── GMP Analysis ───────────────────────────────────────────────────

export function getGmpAccuracyStats(ipos: IPOData[]): GmpAccuracyStats {
    const withGmp = ipos.filter(i => i.gmpPercent !== null);
    const positive = withGmp.filter(i => (i.gmpPercent ?? 0) > 0);
    const negative = withGmp.filter(i => (i.gmpPercent ?? 0) < 0);
    const neutral = withGmp.filter(i => (i.gmpPercent ?? 0) === 0);

    const avgGmpPercent = withGmp.length > 0
        ? withGmp.reduce((sum, i) => sum + (i.gmpPercent ?? 0), 0) / withGmp.length
        : 0;

    // Distribution buckets
    const ranges = [
        { range: '< -20%', min: -Infinity, max: -20 },
        { range: '-20% to -10%', min: -20, max: -10 },
        { range: '-10% to 0%', min: -10, max: 0 },
        { range: '0% to 10%', min: 0, max: 10 },
        { range: '10% to 25%', min: 10, max: 25 },
        { range: '25% to 50%', min: 25, max: 50 },
        { range: '50% to 100%', min: 50, max: 100 },
        { range: '> 100%', min: 100, max: Infinity },
    ];

    const distribution = ranges.map(r => ({
        range: r.range,
        count: withGmp.filter(i => {
            const pct = i.gmpPercent ?? 0;
            return pct >= r.min && pct < r.max;
        }).length,
    }));

    return {
        totalTracked: withGmp.length,
        avgGmpPercent: Math.round(avgGmpPercent * 100) / 100,
        positiveGmpCount: positive.length,
        negativeGmpCount: negative.length,
        neutralCount: neutral.length,
        gmpDistribution: distribution.filter(d => d.count > 0),
    };
}

// ─── GMP Sentiment Score ────────────────────────────────────────────
// Converts GMP data into a simple sentiment label for UI badges

export type GmpSentiment = 'strong_positive' | 'positive' | 'neutral' | 'negative' | 'strong_negative';

export function getGmpSentiment(gmpPercent: number | null): { sentiment: GmpSentiment; label: string; color: string } {
    if (gmpPercent === null) return { sentiment: 'neutral', label: 'No Data', color: '#888' };
    if (gmpPercent >= 50) return { sentiment: 'strong_positive', label: 'Very Bullish', color: '#22c55e' };
    if (gmpPercent >= 10) return { sentiment: 'positive', label: 'Bullish', color: '#4ade80' };
    if (gmpPercent >= -5) return { sentiment: 'neutral', label: 'Neutral', color: '#f59e0b' };
    if (gmpPercent >= -20) return { sentiment: 'negative', label: 'Bearish', color: '#f87171' };
    return { sentiment: 'strong_negative', label: 'Very Bearish', color: '#ef4444' };
}

// ─── Allotment Probability Estimation ───────────────────────────────
// Based on subscription multiples. Higher subscription = lower probability.

export function estimateAllotmentProbability(subscriptionNum: number | null, category: 'IPO' | 'SME'): {
    probability: number;
    label: string;
    color: string;
} {
    if (subscriptionNum === null || subscriptionNum <= 0) {
        return { probability: 100, label: 'Very High', color: '#22c55e' };
    }

    // Retail (RII) probability estimation based on subscription multiple
    // Formula: ~1/subscription for oversubscribed IPOs (simplified)
    let probability: number;

    if (subscriptionNum <= 1) {
        probability = 95;
    } else if (subscriptionNum <= 3) {
        probability = Math.round(100 / subscriptionNum);
    } else if (subscriptionNum <= 10) {
        probability = Math.round(80 / subscriptionNum);
    } else if (subscriptionNum <= 50) {
        probability = Math.round(60 / subscriptionNum);
    } else {
        probability = Math.max(1, Math.round(30 / subscriptionNum));
    }

    // SME IPOs typically have slightly different dynamics
    if (category === 'SME' && subscriptionNum > 5) {
        probability = Math.max(1, Math.round(probability * 0.8));
    }

    probability = Math.min(99, Math.max(1, probability));

    let label: string;
    let color: string;
    if (probability >= 70) { label = 'Very High'; color = '#22c55e'; }
    else if (probability >= 40) { label = 'Good'; color = '#4ade80'; }
    else if (probability >= 15) { label = 'Moderate'; color = '#f59e0b'; }
    else if (probability >= 5) { label = 'Low'; color = '#f87171'; }
    else { label = 'Very Low'; color = '#ef4444'; }

    return { probability, label, color };
}

// ─── Plain-language explainers ──────────────────────────────────────
// Turn raw IPO numbers into sentences a first-time investor understands.

/** Describe subscription demand in plain words. */
export function getSubscriptionDemand(subscriptionNum: number | null): {
    label: string; desc: string; color: string;
} {
    if (subscriptionNum === null || subscriptionNum <= 0) {
        return { label: 'No demand data yet', desc: 'Subscription figures appear once bidding opens.', color: '#71717A' };
    }
    if (subscriptionNum < 1) {
        return {
            label: 'Undersubscribed',
            desc: `Investors applied for less than the shares on offer (${subscriptionNum}× of the issue). Weak demand.`,
            color: '#f87171',
        };
    }
    if (subscriptionNum < 3) {
        return {
            label: 'Healthy demand',
            desc: `Investors applied for ${subscriptionNum}× the shares available. Comfortably covered.`,
            color: '#4ade80',
        };
    }
    if (subscriptionNum < 10) {
        return {
            label: 'Strong demand',
            desc: `Investors applied for ${subscriptionNum}× the shares available. Solid interest.`,
            color: '#22c55e',
        };
    }
    if (subscriptionNum < 50) {
        return {
            label: 'Very strong demand',
            desc: `Investors applied for ${subscriptionNum}× the shares available. Allotment will be hard to get.`,
            color: '#22c55e',
        };
    }
    return {
        label: 'Frenzied demand',
        desc: `Investors applied for ${subscriptionNum}× the shares available. Among the most in-demand IPOs.`,
        color: '#16a34a',
    };
}

/** Plain-language sentence for what the GMP implies about listing day. */
export function getExpectedListingText(price: number | null, gmpPercent: number | null, estListing: number | null): string {
    if (gmpPercent === null || price === null) {
        return 'There is no grey market signal yet, so listing gains are hard to estimate.';
    }
    const listingText = estListing ? ` around ₹${estListing}` : '';
    if (gmpPercent > 0) {
        return `The grey market is paying a premium, suggesting it could list${listingText}   roughly +${gmpPercent}% above the ₹${price} issue price. This is unofficial and can change daily.`;
    }
    if (gmpPercent < 0) {
        return `The grey market is trading at a discount, suggesting it could list${listingText}   about ${gmpPercent}% below the ₹${price} issue price. Demand looks weak.`;
    }
    return `The grey market signal is flat, suggesting it may list near its ₹${price} issue price.`;
}

/** A single plain-language verdict combining sentiment, demand and allotment odds. */
export function getIPOPlainVerdict(ipo: IPOData): { headline: string; body: string; color: string } {
    const sentiment = getGmpSentiment(ipo.gmpPercent);
    const demand = getSubscriptionDemand(ipo.subscriptionNum);

    const parts: string[] = [];

    if (ipo.gmpPercent !== null) {
        parts.push(getExpectedListingText(ipo.price, ipo.gmpPercent, ipo.estListing));
    }
    if (ipo.subscriptionNum && ipo.subscriptionNum > 0) {
        parts.push(demand.desc);
        const allotment = estimateAllotmentProbability(ipo.subscriptionNum, ipo.category);
        parts.push(`Your estimated chance of getting an allotment in the retail category is about ${allotment.probability}% (${allotment.label.toLowerCase()}).`);
    }

    let headline: string;
    if (ipo.gmpPercent === null && !ipo.subscriptionNum) {
        headline = 'Not enough data to assess yet';
        parts.push('Grey market and subscription figures usually appear closer to the open date.');
    } else if ((ipo.gmpPercent ?? 0) >= 10 && (ipo.subscriptionNum ?? 0) >= 3) {
        headline = 'Strong listing-gain signals';
    } else if ((ipo.gmpPercent ?? 0) <= -5 || (ipo.subscriptionNum !== null && ipo.subscriptionNum < 1)) {
        headline = 'Weak signals   be cautious';
    } else {
        headline = 'Mixed signals';
    }

    return { headline, body: parts.join(' '), color: sentiment.color };
}

// ─── Top Movers & Rankings ──────────────────────────────────────────

export function getTopGmpMovers(ipos: IPOData[], limit = 5) {
    const withGmp = ipos.filter(i => i.gmpPercent !== null && i.price !== null);

    const topPositive = [...withGmp]
        .sort((a, b) => (b.gmpPercent ?? 0) - (a.gmpPercent ?? 0))
        .slice(0, limit);

    const topNegative = [...withGmp]
        .sort((a, b) => (a.gmpPercent ?? 0) - (b.gmpPercent ?? 0))
        .slice(0, limit)
        .filter(i => (i.gmpPercent ?? 0) < 0);

    const mostSubscribed = [...ipos]
        .filter(i => i.subscriptionNum !== null && i.subscriptionNum > 0)
        .sort((a, b) => (b.subscriptionNum ?? 0) - (a.subscriptionNum ?? 0))
        .slice(0, limit);

    return { topPositive, topNegative, mostSubscribed };
}
