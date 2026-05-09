'use client';

import { Suspense, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { useSubscription } from '@/hooks/useSubscription';
import {
    LogOut, Crown, Bookmark, Bell, BarChart3,
    GraduationCap, TrendingUp, ChevronRight, Loader2,
    CalendarDays, Mail,
} from 'lucide-react';
import Link from 'next/link';
import styles from './page.module.css';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ProfilePage() {
    return (
        <Suspense fallback={
            <div className={styles.loadingScreen}>
                <Loader2 className={styles.spinner} />
            </div>
        }>
            <ProfileContent />
        </Suspense>
    );
}

function ProfileContent() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [email, setEmail] = useState('');
    const [memberSince, setMemberSince] = useState('');
    const [watchlistCount, setWatchlistCount] = useState(0);
    const [alertsCount, setAlertsCount] = useState(0);
    const [cancelLoading, setCancelLoading] = useState(false);
    const supabase = createClient();
    const router = useRouter();
    const searchParams = useSearchParams();
    const upgraded = searchParams.get('upgraded') === 'true';
    const { isPro, planId, periodEnd, cancelAtPeriodEnd, refresh: refreshSub } = useSubscription();

    useEffect(() => {
        const load = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { router.push('/login'); return; }

                setEmail(user.email || '');
                setMemberSince(new Date(user.created_at).toLocaleDateString('en-IN', {
                    month: 'short', year: 'numeric'
                }));

                const [profileRes, watchRes, alertsRes] = await Promise.all([
                    supabase.from('profiles').select('*').eq('id', user.id).single(),
                    supabase.from('watchlist').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                    supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                ]);

                setProfile(profileRes.data || {
                    username: user.email?.split('@')[0],
                    full_name: user.user_metadata?.full_name || 'Trader',
                });
                setWatchlistCount(watchRes.count ?? 0);
                setAlertsCount(alertsRes.count ?? 0);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [supabase, router]);

    const handleCancel = async () => {
        if (!confirm("Cancel your Pro subscription? You'll keep access until the end of your billing period.")) return;
        setCancelLoading(true);
        try {
            const res = await fetch('/api/billing/cancel', { method: 'POST' });
            if (res.ok) await refreshSub();
        } catch (e) { console.error(e); }
        finally { setCancelLoading(false); }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    if (loading) {
        return (
            <div className={styles.loadingScreen}>
                <Loader2 className={styles.spinner} />
            </div>
        );
    }

    const displayName = profile?.full_name || 'Staqq Member';
    const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

    return (
        <main className={styles.main}>
            <div className={styles.heroGlow} />

            <div className="container">
                {/* Upgrade success banner */}
                {upgraded && (
                    <div className={styles.upgradeBanner}>
                        <Crown size={16} />
                        Welcome to Staqq Pro! Your subscription is now active.
                    </div>
                )}

                {/* Hero */}
                <div className={styles.hero}>
                    <div className={styles.heroInner}>
                        <div className={styles.avatarWrap}>
                            <div className={styles.avatar}>{initials}</div>
                            {isPro && <div className={styles.proCrown}><Crown size={12} /></div>}
                        </div>
                        <div className={styles.heroInfo}>
                            <div className={styles.nameRow}>
                                <h1 className={styles.displayName}>{displayName}</h1>
                                {isPro && <PremiumBadge size="sm" />}
                            </div>
                            <p className={styles.handle}>@{profile?.username || 'member'}</p>
                            <div className={styles.heroPills}>
                                <span className={styles.heroPill}><Mail size={11} />{email}</span>
                                <span className={styles.heroPill}><CalendarDays size={11} />Since {memberSince}</span>
                            </div>
                        </div>
                    </div>

                    {/* Stat row */}
                    <div className={styles.statRow}>
                        <div className={styles.stat}>
                            <span className={styles.statNum}>{watchlistCount}</span>
                            <span className={styles.statLbl}>Watchlist</span>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.stat}>
                            <span className={styles.statNum}>{alertsCount}</span>
                            <span className={styles.statLbl}>Alerts</span>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.stat}>
                            <span className={styles.statNum}>{isPro ? 'Pro' : 'Free'}</span>
                            <span className={styles.statLbl}>Plan</span>
                        </div>
                    </div>
                </div>

                {/* Body grid */}
                <div className={styles.grid}>
                    {/* Left */}
                    <div className={styles.leftCol}>
                        {/* Subscription */}
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <span className={styles.cardTitle}>Subscription</span>
                                {isPro && <PremiumBadge size="sm" />}
                            </div>

                            {isPro ? (
                                <div className={styles.subBody}>
                                    <div className={styles.planBadge}>
                                        <Crown size={14} />
                                        {planId?.includes('yearly') ? 'Pro Yearly' : 'Pro Monthly'}
                                    </div>
                                    {periodEnd && (
                                        <div className={styles.infoRow}>
                                            <span className={styles.infoLabel}>
                                                {cancelAtPeriodEnd ? 'Access until' : 'Next billing'}
                                            </span>
                                            <span className={styles.infoValue}>
                                                {new Date(periodEnd).toLocaleDateString('en-IN', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                    )}
                                    {cancelAtPeriodEnd ? (
                                        <p className={styles.cancelNote}>Subscription will not renew.</p>
                                    ) : (
                                        <button className={styles.cancelBtn} onClick={handleCancel} disabled={cancelLoading}>
                                            {cancelLoading ? 'Cancelling...' : 'Cancel subscription'}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className={styles.subBody}>
                                    <p className={styles.freeNote}>You're on the <strong>Free</strong> plan. Upgrade for real-time data, unlimited alerts, and more.</p>
                                    <Link href="/pricing" className={styles.upgradeBtn}>
                                        <Crown size={15} />
                                        Upgrade to Pro
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Account info */}
                        <div className={styles.card}>
                            <span className={styles.cardTitle}>Account</span>
                            <div className={styles.infoRows}>
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>Email</span>
                                    <span className={styles.infoValue}>{email}</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>Username</span>
                                    <span className={styles.infoValue}>@{profile?.username || 'member'}</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>Member since</span>
                                    <span className={styles.infoValue}>{memberSince}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right */}
                    <div className={styles.rightCol}>
                        {/* Quick access */}
                        <div className={styles.card}>
                            <span className={styles.cardTitle}>Quick Access</span>
                            <div className={styles.quickLinks}>
                                {[
                                    { href: '/watchlist',       icon: <Bookmark size={16} />,    label: 'Watchlist',  sub: `${watchlistCount} stocks` },
                                    { href: '/alerts',          icon: <Bell size={16} />,        label: 'Alerts',     sub: `${alertsCount} active` },
                                    { href: '/stocks/screener', icon: <BarChart3 size={16} />,   label: 'Screener',   sub: 'NSE 500+' },
                                    { href: '/learn',           icon: <GraduationCap size={16}/>, label: 'Learn',     sub: '5 tracks' },
                                    { href: '/ipo',             icon: <TrendingUp size={16} />,  label: 'IPO Hub',    sub: 'Upcoming IPOs' },
                                ].map(item => (
                                    <Link key={item.href} href={item.href} className={styles.quickLink}>
                                        <div className={styles.quickLinkIcon}>{item.icon}</div>
                                        <div className={styles.quickLinkText}>
                                            <span className={styles.quickLinkLabel}>{item.label}</span>
                                            <span className={styles.quickLinkSub}>{item.sub}</span>
                                        </div>
                                        <ChevronRight size={14} className={styles.quickLinkArrow} />
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Logout */}
                        <button className={styles.logoutBtn} onClick={handleLogout}>
                            <LogOut size={16} />
                            Log Out
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
