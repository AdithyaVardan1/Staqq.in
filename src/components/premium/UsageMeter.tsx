'use client';

import React from 'react';
import Link from 'next/link';

interface UsageMeterProps {
    current: number;
    limit: number;
    label?: string;
    showUpgrade?: boolean;
    compact?: boolean;
    className?: string;
}

export const UsageMeter: React.FC<UsageMeterProps> = ({
    current,
    limit,
    label = 'lookups used today',
    showUpgrade = true,
    compact = false,
    className = '',
}) => {
    if (limit === -1) return null; // Unlimited   don't show meter

    const percentage = Math.min((current / limit) * 100, 100);
    const isNearLimit = percentage >= 80;
    const isAtLimit = current >= limit;

    const barColor = isAtLimit
        ? '#EF4444'
        : isNearLimit
            ? '#F59E0B'
            : '#CAFF00';

    if (compact) {
        return (
            <span
                className={className}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    color: isAtLimit ? '#EF4444' : '#A1A1AA',
                }}
            >
                <span style={{ fontWeight: 600 }}>
                    {current}/{limit}
                </span>
                {label}
            </span>
        );
    }

    return (
        <div
            className={className}
            style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${isAtLimit ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`,
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#A1A1AA' }}>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{current}</span>/{limit} {label}
                </span>
                {showUpgrade && isNearLimit && (
                    <Link
                        href="/pricing"
                        style={{
                            fontSize: '0.75rem',
                            color: '#CAFF00',
                            textDecoration: 'none',
                            fontWeight: 600,
                        }}
                    >
                        Upgrade →
                    </Link>
                )}
            </div>

            {/* Progress bar */}
            <div
                style={{
                    height: '4px',
                    borderRadius: '2px',
                    background: 'rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        width: `${percentage}%`,
                        height: '100%',
                        borderRadius: '2px',
                        background: barColor,
                        transition: 'width 0.3s ease',
                    }}
                />
            </div>

            {isAtLimit && (
                <p style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: '6px', marginBottom: 0 }}>
                    Daily limit reached.{' '}
                    <Link href="/pricing" style={{ color: '#CAFF00', textDecoration: 'underline' }}>
                        Upgrade for unlimited access
                    </Link>
                </p>
            )}
        </div>
    );
};
