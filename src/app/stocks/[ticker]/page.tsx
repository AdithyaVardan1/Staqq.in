import React from 'react';
import type { Metadata } from 'next';
import StockDetailContent from './StockDetailContent';
import { StructuredData, BreadcrumbStructuredData } from '@/components/StructuredData';
import { yahoo } from '@/lib/yahoo';

export async function generateMetadata({ params }: { params: Promise<{ ticker: string }> }): Promise<Metadata> {
    const { ticker } = await params;
    const upperTicker = ticker.toUpperCase();

    const sym = upperTicker.endsWith('.NS') || upperTicker.endsWith('.BO') ? upperTicker : `${upperTicker}.NS`;
    let nameStr = '';
    let priceStr = '';
    let pctStr = '';
    let changeStr = '';
    let mcapStr = '';
    let peStr = '';

    try {
        const q = await yahoo.getQuote(sym);
        if (q) {
            nameStr = q.longName || q.shortName || '';
            priceStr = q.regularMarketPrice ? String(q.regularMarketPrice) : '';
            changeStr = q.regularMarketChange ? String(q.regularMarketChange.toFixed(2)) : '';
            pctStr = q.regularMarketChangePercent ? String(q.regularMarketChangePercent.toFixed(2)) : '';
            const mc = q.marketCap;
            if (mc) {
                if (mc >= 1e12) mcapStr = `${(mc / 1e12).toFixed(2)}T`;
                else if (mc >= 1e7) mcapStr = `${(mc / 1e7).toFixed(2)}Cr`;
                else mcapStr = `${(mc / 1e5).toFixed(2)}L`;
            }
            peStr = q.trailingPE ? String(q.trailingPE.toFixed(1)) : '';
        }
    } catch (e) {
        console.error('generateMetadata quote fetch failed', e);
    }

    const title = nameStr 
        ? `${upperTicker} (${nameStr}) Stock Price & Analysis | Staqq`
        : `${upperTicker} Stock Price, Fundamentals & Analysis | Staqq`;
    const description = nameStr
        ? `Live ${nameStr} (${upperTicker}) stock price, financials, shareholding pattern, and market analysis on Staqq.`
        : `Live ${upperTicker} stock price, financials, FII/DII data, and technical indicators. Get comprehensive analysis for ${upperTicker} on Staqq.`;

    const ogParams = new URLSearchParams();
    ogParams.set('ticker', upperTicker);
    if (nameStr) ogParams.set('name', nameStr);
    if (priceStr) ogParams.set('price', priceStr);
    if (changeStr) ogParams.set('change', changeStr);
    if (pctStr) ogParams.set('changePct', pctStr);
    if (mcapStr) ogParams.set('mcap', mcapStr);
    if (peStr) ogParams.set('pe', peStr);

    const ogImageUrl = `/api/og/stock?${ogParams.toString()}`;

    return {
        title,
        description,
        alternates: {
            canonical: `/stocks/${ticker}`,
        },
        openGraph: {
            title,
            description,
            type: 'website',
            url: `https://staqq.in/stocks/${ticker}`,
            images: [ogImageUrl]
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [ogImageUrl]
        }
    };
}

export default async function StockDetailPage({ params }: { params: Promise<{ ticker: string }> }) {
    const { ticker } = await params;
    const upperTicker = ticker.toUpperCase();

    const stockJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FinancialProduct',
        'name': `${upperTicker} Stock`,
        'description': `Comprehensive stock analysis and real-time data for ${upperTicker} on Nifty/BSE.`,
        'provider': {
            '@type': 'Organization',
            'name': 'Staqq',
            'url': 'https://staqq.in'
        }
    };

    return (
        <>
            <StructuredData schema={stockJsonLd} />
            <BreadcrumbStructuredData items={[
                { name: 'Home', item: 'https://staqq.in' },
                { name: 'Screener', item: 'https://staqq.in/stocks/screener' },
                { name: upperTicker, item: `https://staqq.in/stocks/${ticker}` } 
            ]} />
            <React.Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0a0a' }} />}>
                <StockDetailContent params={params} />
            </React.Suspense>
        </>
    );
}
