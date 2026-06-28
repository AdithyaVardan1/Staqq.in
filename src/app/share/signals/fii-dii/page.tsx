import React from 'react';
import type { Metadata } from 'next';
import { fetchFiiDiiToday } from '@/lib/fiiDii';
import { FiiDiiShareCard } from '@/components/share/SignalShareCard';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const revalidate = 900;

export async function generateMetadata(): Promise<Metadata> {
    const data = await fetchFiiDiiToday();

    if (!data) {
        return {
            title: 'FII/DII Flows | Staqq',
            description: 'Real-time FII/DII institutional flow data for Indian stock markets.',
        };
    }

    const isBullish = data.totalNet >= 0;
    const direction = isBullish ? 'Net Buying' : 'Net Selling';
    const netDisplay = `${isBullish ? '+' : ''}₹${Math.abs(data.totalNet).toLocaleString('en-IN')} Cr`;
    const title = `FII/DII Flows   ${direction} ${netDisplay}`;
    const description = `FII Net: ₹${data.fii.net.toLocaleString('en-IN')} Cr | DII Net: ₹${data.dii.net.toLocaleString('en-IN')} Cr   ${data.date}`;

    const ogParams = new URLSearchParams({
        type: 'fii-dii',
        title: `FII/DII Flows   ${direction}`,
        value: netDisplay,
        direction: isBullish ? 'bullish' : 'bearish',
        d1: `FII Net:₹${data.fii.net.toLocaleString('en-IN')} Cr`,
        d2: `DII Net:₹${data.dii.net.toLocaleString('en-IN')} Cr`,
        date: data.date,
    });

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'website',
            images: [`/api/og/signals?${ogParams.toString()}`],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [`/api/og/signals?${ogParams.toString()}`],
        },
    };
}

export default async function ShareFiiDiiPage() {
    const data = await fetchFiiDiiToday();

    return (
        <main style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '80px' }}>
            <div className="container" style={{ maxWidth: '560px', margin: '0 auto', padding: '0 20px' }}>
                {data ? (
                    <FiiDiiShareCard data={data} />
                ) : (
                    <div style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
                        <h3 style={{ color: '#fff', marginBottom: '8px' }}>FII/DII data unavailable</h3>
                        <p>Data is typically available after market hours (6-7 PM IST).</p>
                    </div>
                )}

                <div style={{ marginTop: '32px', textAlign: 'center' }}>
                    <Link
                        href="/signals/fii-dii"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#6366f1',
                            textDecoration: 'none',
                            fontSize: '15px',
                            fontWeight: 600,
                        }}
                    >
                        View full FII/DII data <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        </main>
    );
}
