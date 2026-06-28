import { NextRequest, NextResponse } from 'next/server';
import { getAllIPOs } from '@/lib/ipo';
import { fetchFiiDiiToday } from '@/lib/fiiDii';

export const revalidate = 900; // 15 min cache

// GET /api/daily-card
// Returns today's market summary data + pre-composed OG image URL
// Useful for: social media bots, daily cron posts, embed widgets
export async function GET(req: NextRequest) {
    try {
        const baseUrl = new URL(req.url).origin;

        // Fetch data in parallel
        const [allIPOs, fiiDii] = await Promise.all([
            getAllIPOs(),
            fetchFiiDiiToday(),
        ]);

        const liveIPOs = allIPOs.filter(i => i.status === 'Live');
        const upcomingIPOs = allIPOs.filter(i => i.status === 'Upcoming');

        // Top GMP IPO
        const withGmp = allIPOs.filter(i => i.gmpPercent !== null && i.gmpPercent > 0);
        const topGmpIPO = withGmp.sort((a, b) => (b.gmpPercent ?? 0) - (a.gmpPercent ?? 0))[0] || null;

        const today = new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });

        // Compose OG image URL
        const ogParams = new URLSearchParams({
            date: today,
            live: String(liveIPOs.length),
        });

        if (topGmpIPO) {
            ogParams.set('topIpo', topGmpIPO.name);
            ogParams.set('topGmp', `+${topGmpIPO.gmpPercent}%`);
        }

        if (fiiDii) {
            const fiiSign = fiiDii.fii.net >= 0 ? '+' : '';
            const diiSign = fiiDii.dii.net >= 0 ? '+' : '';
            ogParams.set('fiiNet', `${fiiSign}₹${Math.abs(fiiDii.fii.net).toLocaleString('en-IN')} Cr`);
            ogParams.set('diiNet', `${diiSign}₹${Math.abs(fiiDii.dii.net).toLocaleString('en-IN')} Cr`);
            ogParams.set('fiiDir', fiiDii.fii.net >= 0 ? 'bullish' : 'bearish');
            ogParams.set('diiDir', fiiDii.dii.net >= 0 ? 'bullish' : 'bearish');
        }

        const ogImageUrl = `${baseUrl}/api/og/daily?${ogParams.toString()}`;

        // Social share text
        const shareLines: string[] = [
            `📊 Staqq Daily Brief   ${today}`,
            '',
        ];

        if (liveIPOs.length > 0) {
            shareLines.push(`🔴 ${liveIPOs.length} Live IPO${liveIPOs.length > 1 ? 's' : ''}`);
        }
        if (upcomingIPOs.length > 0) {
            shareLines.push(`📅 ${upcomingIPOs.length} Upcoming IPO${upcomingIPOs.length > 1 ? 's' : ''}`);
        }
        if (topGmpIPO) {
            shareLines.push(`🔥 Top GMP: ${topGmpIPO.name} (+${topGmpIPO.gmpPercent}%)`);
        }

        if (fiiDii) {
            const fiiEmoji = fiiDii.fii.net >= 0 ? '🟢' : '🔴';
            const diiEmoji = fiiDii.dii.net >= 0 ? '🟢' : '🔴';
            shareLines.push('');
            shareLines.push(`${fiiEmoji} FII: ${fiiDii.fii.net >= 0 ? '+' : ''}₹${fiiDii.fii.net.toLocaleString('en-IN')} Cr`);
            shareLines.push(`${diiEmoji} DII: ${fiiDii.dii.net >= 0 ? '+' : ''}₹${fiiDii.dii.net.toLocaleString('en-IN')} Cr`);
        }

        shareLines.push('');
        shareLines.push('👉 staqq.in');

        return NextResponse.json({
            date: today,
            summary: {
                liveIPOs: liveIPOs.length,
                upcomingIPOs: upcomingIPOs.length,
                topGmpIPO: topGmpIPO ? {
                    name: topGmpIPO.name,
                    slug: topGmpIPO.slug,
                    gmpPercent: topGmpIPO.gmpPercent,
                    price: topGmpIPO.price,
                } : null,
                fiiDii: fiiDii ? {
                    fiiNet: fiiDii.fii.net,
                    diiNet: fiiDii.dii.net,
                    totalNet: fiiDii.totalNet,
                    date: fiiDii.date,
                } : null,
            },
            ogImageUrl,
            shareText: shareLines.join('\n'),
        });
    } catch (error) {
        console.error('[Daily Card] Error:', error);
        return NextResponse.json({ error: 'Failed to generate daily card' }, { status: 500 });
    }
}
