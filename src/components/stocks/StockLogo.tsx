
'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import styles from './StockLogo.module.css';

interface StockLogoProps {
    ticker: string;
    name: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

export const StockLogo: React.FC<StockLogoProps> = ({
    ticker,
    name,
    size = 'md',
    className
}) => {
    const [srcIndex, setSrcIndex] = useState(0);
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const clientId = process.env.NEXT_PUBLIC_BRANDFETCH_ID;

    // Normalize ticker
    const uppercaseTicker = ticker?.trim()?.toUpperCase() || '';
    const baseTicker = uppercaseTicker.split('.')[0];
    const nsTicker = baseTicker + '.NS';

    // Reset state on ticker change
    React.useEffect(() => {
        setSrcIndex(0);
        setStatus('loading');
    }, [ticker]);

    const sources = [
        `/logos/${baseTicker}.png`,
        `/logos/${baseTicker}.svg`
    ];

    const currentSrc = sources[srcIndex];

    const handleError = () => {
        if (srcIndex < sources.length - 1) {
            setSrcIndex(prev => prev + 1);
            setStatus('loading');
        } else {
            setStatus('error');
        }
    };

    const handleLoad = () => {
        setStatus('success');
    };

    return (
        <div
            className={clsx(
                styles.container,
                styles[size],
                className,
                status === 'success' && styles.hasLogo
            )}
            suppressHydrationWarning
            title={name}
        >
            {status !== 'success' && (
                <div className={styles.fallback}>
                    {(name || ticker || '?').charAt(0)}
                </div>
            )}

            {status !== 'error' && uppercaseTicker && (
                <img
                    key={currentSrc} // Force re-render on src change
                    src={currentSrc}
                    alt={name}
                    className={clsx(styles.logo, status !== 'success' && styles.hidden)}
                    onLoad={handleLoad}
                    onError={handleError}
                />
            )}
        </div>
    );
};
