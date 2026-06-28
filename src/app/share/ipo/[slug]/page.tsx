import React from 'react';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getAllIPOs } from '@/lib/ipo';
import { getGmpSentiment } from '@/lib/ipoAnalytics';
import IPOShareCard from '@/components/share/IPOShareCard';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const allIPOs = await getAllIPOs();
    const ipo = allIPOs.find(i => i.slug === slug);

    if (!ipo) return { title: 'IPO Not Found | Staqq' };

    const sentiment = getGmpSentiment(ipo.gmpPercent);
    const gmpText = ipo.gmpPercent !== null ? `GMP ${ipo.gmpPercent >= 0 ? '+' : ''}${ipo.gmpPercent}%` : '';
    const title = `${ipo.name} IPO ${gmpText}   ${sentiment.label}`;
    const description = `${ipo.name} ${ipo.category}   ${gmpText}${ipo.subscription ? `, ${ipo.subscription} subscribed` : ''}${ipo.price ? `, ₹${ipo.price} issue price` : ''}. Real-time IPO intelligence on Staqq.`;

    const ogParams = new URLSearchParams({
        name: ipo.name,
        ...(ipo.price && { price: String(ipo.price) }),
        ...(ipo.gmp !== null && { gmp: String(ipo.gmp) }),
        ...(ipo.gmpPercent !== null && { gmpPct: String(ipo.gmpPercent) }),
        ...(ipo.subscription && { sub: ipo.subscription }),
        status: ipo.status,
        category: ipo.category,
        sentiment: sentiment.sentiment,
    });

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'website',
            images: [`/api/og/ipo?${ogParams.toString()}`],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [`/api/og/ipo?${ogParams.toString()}`],
        },
    };
}

export default async function ShareIPOPage({ params }: Props) {
    const { slug } = await params;
    const allIPOs = await getAllIPOs();
    const ipo = allIPOs.find(i => i.slug === slug);

    if (!ipo) notFound();

    return (
        <main style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '80px' }}>
            <div className="container" style={{ maxWidth: '560px', margin: '0 auto', padding: '0 20px' }}>
                <IPOShareCard ipo={ipo} />

                <div style={{ marginTop: '32px', textAlign: 'center' }}>
                    <Link
                        href={`/ipo/${slug}`}
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
                        View full IPO details <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        </main>
    );
}
