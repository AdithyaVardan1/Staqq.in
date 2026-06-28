'use client';

import React from 'react';
import ShareableCard from './ShareableCard';
import type { FiiDiiDaily } from '@/lib/fiiDii';

interface FiiDiiShareCardProps {
    data: FiiDiiDaily;
}

export function FiiDiiShareCard({ data }: FiiDiiShareCardProps) {
    const isBullish = data.totalNet >= 0;
    const color = isBullish ? '#22c55e' : '#ef4444';
    const direction = isBullish ? 'Net Buying' : 'Net Selling';

    const netDisplay = `${isBullish ? '+' : ''}₹${Math.abs(data.totalNet).toLocaleString('en-IN')} Cr`;

    return (
        <ShareableCard
            title="FII/DII Flows"
            subtitle={`${data.date} · ${direction}`}
            bigValue={netDisplay}
            bigValueColor={color}
            bigLabel="Combined Net (FII + DII)"
            badge={{
                text: direction,
                color,
                bg: `${color}18`,
            }}
            stats={[
                {
                    label: 'FII Net',
                    value: `₹${data.fii.net.toLocaleString('en-IN')} Cr`,
                    color: data.fii.net >= 0 ? '#22c55e' : '#ef4444',
                },
                {
                    label: 'DII Net',
                    value: `₹${data.dii.net.toLocaleString('en-IN')} Cr`,
                    color: data.dii.net >= 0 ? '#22c55e' : '#ef4444',
                },
            ]}
            glowColor={`${color}25`}
            shareUrl="/signals/fii-dii"
            shareText={`FII/DII Flows (${data.date})   ${direction} ${netDisplay} | Staqq`}
        />
    );
}
