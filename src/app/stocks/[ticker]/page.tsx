import React from 'react';
import type { Metadata } from 'next';
import StockDetailContent from './StockDetailContent';
import { StructuredData, BreadcrumbStructuredData } from '@/components/StructuredData';

export async function generateMetadata({ params }: { params: Promise<{ ticker: string }> }): Promise<Metadata> {
    const { ticker } = await params;
    const upperTicker = ticker.toUpperCase();
    
    // In a real scenario, we might fetch basic info here to customize the title/description
    const title = `${upperTicker} Stock Price, Fundamentals & Analysis | Staqq`;
    const description = `Live ${upperTicker} stock price, financials, FII/DII data, and technical indicators. Get comprehensive analysis for ${upperTicker} on Staqq.`;

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
            url: `https://staqqin.vercel.app/stocks/${ticker}`,
            images: [`/api/og/stock?ticker=${upperTicker}`]
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [`/api/og/stock?ticker=${upperTicker}`]
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
            'url': 'https://staqqin.vercel.app'
        }
    };

    return (
        <>
            <StructuredData schema={stockJsonLd} />
            <BreadcrumbStructuredData items={[
                { name: 'Home', item: 'https://staqqin.vercel.app' },
                { name: 'Screener', item: 'https://staqqin.vercel.app/stocks/screener' },
                { name: upperTicker, item: `https://staqqin.vercel.app/stocks/${ticker}` } 
            ]} />
            <React.Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0a0a' }} />}>
                <StockDetailContent params={params} />
            </React.Suspense>
        </>
    );
}
