'use client';

import { useState, useEffect, useRef } from 'react';
import { isMarketOpen } from '@/utils/market-hours';

const POLL_INTERVAL = 15000; // 15 seconds during market hours

export function useLiveMarketData(
    ticker: string,
    initialPrice?: number,
    initialChange?: number,
    initialChangePercent?: number
) {
    const [price, setPrice] = useState(initialPrice);
    const [change, setChange] = useState(initialChange);
    const [changePercent, setChangePercent] = useState(initialChangePercent);
    const [status, setStatus] = useState<'idle' | 'live' | 'closed' | 'error'>('idle');
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!ticker) return;

        // NSE is closed — no need to poll, just show the last known price
        if (!isMarketOpen()) {
            setStatus('closed');
            return;
        }

        let cancelled = false;

        async function poll() {
            if (cancelled) return;
            try {
                const res = await fetch(`/api/stocks/price?ticker=${encodeURIComponent(ticker)}`, {
                    signal: AbortSignal.timeout(5000),
                });
                if (!res.ok) throw new Error(`${res.status}`);
                const data = await res.json();
                if (cancelled) return;
                if (data.price > 0) {
                    setPrice(data.price);
                    setChange(data.change);
                    setChangePercent(data.changePercent);
                    setStatus('live');
                }
            } catch {
                if (!cancelled) setStatus('error');
            } finally {
                if (!cancelled) {
                    timerRef.current = setTimeout(poll, POLL_INTERVAL);
                }
            }
        }

        poll();

        return () => {
            cancelled = true;
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [ticker]);

    return { price, change, changePercent, status };
}
