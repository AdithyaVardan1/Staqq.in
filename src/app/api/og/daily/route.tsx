import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Daily market summary OG card   designed for social media posting
// Call with data params or let the frontend compose the URL
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);

    const date = searchParams.get('date') || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    // IPO data
    const liveIpos = searchParams.get('live') || '0';
    const topIpo = searchParams.get('topIpo') || '';
    const topGmp = searchParams.get('topGmp') || '';

    // FII/DII
    const fiiNet = searchParams.get('fiiNet') || '';
    const diiNet = searchParams.get('diiNet') || '';
    const fiiDir = searchParams.get('fiiDir') || 'neutral';
    const diiDir = searchParams.get('diiDir') || 'neutral';

    // Trending
    const trending = searchParams.get('trending') || '';

    const fiiColor = fiiDir === 'bullish' ? '#22c55e' : fiiDir === 'bearish' ? '#ef4444' : '#f59e0b';
    const diiColor = diiDir === 'bullish' ? '#22c55e' : diiDir === 'bearish' ? '#ef4444' : '#f59e0b';

    return new ImageResponse(
        (
            <div
                style={{
                    width: '1200px',
                    height: '630px',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'linear-gradient(145deg, #0a0a0a 0%, #0f0f1a 40%, #0a0a14 100%)',
                    padding: '50px 60px',
                    fontFamily: 'system-ui, sans-serif',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Background patterns */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(99,102,241,0.03) 1px, transparent 0)',
                        backgroundSize: '32px 32px',
                        display: 'flex',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        top: '-100px',
                        right: '-50px',
                        width: '400px',
                        height: '400px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
                        display: 'flex',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        bottom: '-100px',
                        left: '100px',
                        width: '300px',
                        height: '300px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
                        display: 'flex',
                    }}
                />

                {/* Top bar */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '32px',
                        position: 'relative',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px',
                                fontWeight: 800,
                                color: '#fff',
                            }}
                        >
                            S
                        </div>
                        <span style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>staqq</span>
                    </div>
                    <span
                        style={{
                            fontSize: '15px',
                            fontWeight: 600,
                            color: '#6366f1',
                            background: 'rgba(99,102,241,0.12)',
                            padding: '6px 16px',
                            borderRadius: '6px',
                            letterSpacing: '0.03em',
                        }}
                    >
                        DAILY BRIEF
                    </span>
                </div>

                {/* Title */}
                <h1
                    style={{
                        fontSize: '48px',
                        fontWeight: 800,
                        color: '#fff',
                        letterSpacing: '-0.03em',
                        margin: 0,
                        marginBottom: '4px',
                        position: 'relative',
                    }}
                >
                    Market Pulse
                </h1>
                <p
                    style={{
                        fontSize: '18px',
                        color: 'rgba(255,255,255,0.4)',
                        margin: 0,
                        marginBottom: '32px',
                        position: 'relative',
                    }}
                >
                    {date}
                </p>

                {/* Data grid */}
                <div
                    style={{
                        display: 'flex',
                        gap: '24px',
                        flex: 1,
                        position: 'relative',
                    }}
                >
                    {/* IPO section */}
                    <div
                        style={{
                            flex: 1,
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '14px',
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '12px' }}>
                            IPO Activity
                        </span>
                        <span style={{ fontSize: '36px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                            {liveIpos} Live
                        </span>
                        {topIpo && (
                            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Top GMP</span>
                                <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{topIpo}</span>
                                {topGmp && (
                                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#4ade80' }}>{topGmp}</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* FII/DII section */}
                    <div
                        style={{
                            flex: 1,
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '14px',
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '12px' }}>
                            Institutional Flows
                        </span>
                        {fiiNet && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>FII</span>
                                    <span style={{ fontSize: '22px', fontWeight: 700, color: fiiColor }}>{fiiNet}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>DII</span>
                                    <span style={{ fontSize: '22px', fontWeight: 700, color: diiColor }}>{diiNet}</span>
                                </div>
                            </div>
                        )}
                        {!fiiNet && (
                            <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>
                                Available after market hours
                            </span>
                        )}
                    </div>

                    {/* Trending section */}
                    {trending && (
                        <div
                            style={{
                                flex: 1,
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '14px',
                                padding: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '12px' }}>
                                Trending Tickers
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {trending.split(',').slice(0, 6).map((t) => (
                                    <span
                                        key={t}
                                        style={{
                                            fontSize: '15px',
                                            fontWeight: 700,
                                            color: '#fff',
                                            background: 'rgba(99,102,241,0.12)',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                        }}
                                    >
                                        {t.trim()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', position: 'relative' }}>
                    <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.2)' }}>staqq.in</span>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.15)' }}>IPO Intelligence & Market Signals</span>
                </div>
            </div>
        ),
        { width: 1200, height: 630 }
    );
}
