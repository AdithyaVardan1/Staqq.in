'use client';

import React from 'react';
import ShareableCard from './ShareableCard';
import type { IPOData } from '@/lib/ipo';
import { getGmpSentiment } from '@/lib/ipoAnalytics';

interface IPOShareCardProps {
    ipo: IPOData;
}

export default function IPOShareCard({ ipo }: IPOShareCardProps) {
    const sentiment = getGmpSentiment(ipo.gmpPercent);

    const gmpDisplay = ipo.gmpPercent !== null
        ? `${ipo.gmpPercent >= 0 ? '+' : ''}${ipo.gmpPercent}%`
        : 'N/A';

    const stats = [
        ipo.price ? { label: 'Issue Price', value: `₹${ipo.price}` } : null,
        ipo.gmp !== null ? { label: 'GMP', value: `₹${ipo.gmp}`, color: sentiment.color } : null,
        ipo.subscription ? { label: 'Subscription', value: ipo.subscription } : null,
        ipo.estListing ? { label: 'Est. Listing', value: `₹${ipo.estListing}` } : null,
    ].filter(Boolean) as { label: string; value: string; color?: string }[];

    const statusBadge = {
        text: ipo.status,
        color: ipo.status === 'Live' ? '#22c55e' : ipo.status === 'Upcoming' ? '#f59e0b' : '#888',
        bg: ipo.status === 'Live' ? 'rgba(34,197,94,0.15)' : ipo.status === 'Upcoming' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
    };

    return (
        <ShareableCard
            title={ipo.name}
            subtitle={`${ipo.category} · ${sentiment.label}`}
            bigValue={ipo.gmpPercent !== null ? gmpDisplay : undefined}
            bigValueColor={sentiment.color}
            bigLabel={ipo.gmpPercent !== null ? 'GMP Sentiment' : undefined}
            badge={statusBadge}
            stats={stats.slice(0, 3)}
            glowColor={`${sentiment.color}30`}
            shareUrl={`/ipo/${ipo.slug}`}
            shareText={`${ipo.name} IPO   GMP ${gmpDisplay} (${sentiment.label}) | Staqq`}
        />
    );
}
