'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Menu, X, Search, User, LogOut, ChevronDown, TrendingUp, Building2, BarChart3, Zap, Activity, Wallet, Shield, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Logo from '@/components/ui/Logo';
import { createClient } from '@/utils/supabase/client';
import { SearchModal } from './SearchModal';
import { NotificationBell } from '@/components/alerts/NotificationBell';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { useSubscription } from '@/hooks/useSubscription';
import styles from './Navbar.module.css';

const navLinks = [
    { name: 'IPO Hub', href: '/ipo' },
    { name: 'Intel', href: '/signals', hasDropdown: true, dropdownKey: 'intel' },
    { name: 'Crypto', href: '/crypto', hasDropdown: true, dropdownKey: 'crypto' },
    { name: 'Stocks', href: '/stocks/screener' },
    { name: 'Learn', href: '/learn' },
    { name: 'Blog', href: '/blog' },
    { name: 'Alerts', href: '/alerts' },
];

const intelDropdown = [
    {
        name: 'Market Feed',
        desc: 'Real-time intelligence and insights',
        href: '/signals',
        icon: <Activity size={14} />,
    },
    {
        name: 'FII / DII',
        desc: 'Institutional buy & sell activity',
        href: '/signals/fii-dii',
        icon: <TrendingUp size={14} />,
    },
    {
        name: 'Insider Trades',
        desc: 'NSE insider filing tracker',
        href: '/signals/insider-trades',
        icon: <Building2 size={14} />,
    },
    {
        name: 'Bulk Deals',
        desc: 'Block & bulk deal scanner',
        href: '/signals/bulk-deals',
        icon: <BarChart3 size={14} />,
    },
];

const cryptoDropdown = [
    {
        name: 'Social Signals',
        desc: 'Token sentiment on Reddit & Twitter',
        href: '/crypto/signals',
        icon: <Zap size={14} />,
    },
    {
        name: 'Wallet Tracker',
        desc: 'Follow smart money wallets',
        href: '/crypto/wallets',
        icon: <Wallet size={14} />,
    },
    {
        name: 'Token Scanner',
        desc: 'Rugpull & honeypot risk check',
        href: '/crypto/scanner',
        icon: <Shield size={14} />,
    },
    {
        name: 'New Launches',
        desc: 'Fresh tokens, pre-filtered for safety',
        href: '/crypto/new-tokens',
        icon: <Rocket size={14} />,
    },
];

export const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const [isSearchOpen, setIsSearchOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);

        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
        };
        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (_event === 'SIGNED_OUT') {
                router.refresh();
            }
        });

        return () => {
            window.removeEventListener('scroll', handleScroll);
            subscription.unsubscribe();
        };
    }, [supabase, router]);

    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
            if (e.key === '/') {
                const target = e.target as HTMLElement;
                if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    setIsSearchOpen(true);
                }
            }
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    const isVioletTheme = pathname.startsWith('/crypto') || pathname.startsWith('/alerts');

    return (
        <>
            <header
                className={clsx(styles.navbar, {
                    [styles.scrolled]: isScrolled,
                    [styles.themeViolet]: isVioletTheme,
                })}
            >
                <div className="container">
                    <div className={styles.inner}>
                        {/* Logo */}
                        <Link href="/" className={styles.logo}>
                            <div className={styles.logoImageWrapper}>
                                <Logo
                                    width={120}
                                    height={120}
                                    className={styles.logoImage}
                                    priority
                                    src={isVioletTheme ? '/ostack_purple.png' : undefined}
                                />
                            </div>
                        </Link>

                        {/* Desktop Nav */}
                        <nav className={styles.desktopNav}>
                            {navLinks.map((link) => {
                                const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));

                                if (link.hasDropdown) {
                                    const isCrypto = link.dropdownKey === 'crypto';
                                    const items = isCrypto ? cryptoDropdown : intelDropdown;
                                    const headerLabel = isCrypto ? 'Crypto Suite' : 'Market Intelligence';
                                    return (
                                        <div key={link.name} className={styles.navDropdownTrigger}>
                                            <Link
                                                href={link.href}
                                                className={clsx(styles.navLink, { [styles.active]: isActive })}
                                            >
                                                {link.name}
                                                <ChevronDown size={13} className={styles.navChevron} />
                                            </Link>

                                            <div className={clsx(styles.navDropdown, isCrypto && styles.navDropdownViolet)}>
                                                <div className={styles.navDropdownHeader}>{headerLabel}</div>
                                                <div className={styles.navDropdownGrid}>
                                                    {items.map((item) => (
                                                        <Link
                                                            key={item.name}
                                                            href={item.href}
                                                            className={clsx(styles.navDropdownItem, isCrypto && styles.navDropdownItemViolet)}
                                                        >
                                                            <div className={clsx(styles.navDropdownIcon, isCrypto && styles.navDropdownIconViolet)}>
                                                                {item.icon}
                                                            </div>
                                                            <span className={styles.navDropdownItemName}>{item.name}</span>
                                                            <span className={styles.navDropdownItemDesc}>{item.desc}</span>
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        className={clsx(styles.navLink, {
                                            [styles.active]: isActive,
                                        })}
                                    >
                                        {link.name}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Actions */}
                        <div className={styles.actions}>
                            <button
                                className={styles.iconBtn}
                                aria-label="Search"
                                onClick={() => setIsSearchOpen(true)}
                                suppressHydrationWarning
                            >
                                <Search size={20} />
                            </button>

                            <NotificationBell isLoggedIn={!!user} />

                            {pathname !== '/' && (
                                <Link href="/watchlist" className={styles.watchlistLink}>
                                    <Button variant="ghost" size="sm" className="hidden md:flex">Watchlist</Button>
                                </Link>
                            )}

                            <div className={styles.desktopAuth}>
                                {user ? (
                                    <div className="flex items-center gap-3">
                                        <SubscriptionCTA />
                                        <Link href="/profile" aria-label="Profile">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-white/10 hover:border-brand/50 transition-colors relative">
                                                <User size={16} className="text-white" />
                                            </div>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <Link href="/login">
                                            <Button variant="ghost" size="sm">Log In</Button>
                                        </Link>
                                        <Link href="/signup">
                                            <Button variant="primary" size="sm" className={styles.getStartedBtn}>Get Started</Button>
                                        </Link>
                                    </div>
                                )}
                            </div>

                            <button
                                className={styles.mobileToggle}
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                aria-label="Toggle Menu"
                                suppressHydrationWarning
                            >
                                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            <div className={clsx(styles.mobileMenu, { [styles.open]: isMobileMenuOpen })}>
                <div className={styles.mobileMenuInner}>
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={clsx(styles.mobileNavLink, {
                                [styles.active]: pathname === link.href,
                            })}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {link.name}
                        </Link>
                    ))}
                    <div className={styles.mobileAuth}>
                        {pathname !== '/' && (
                            <Link href="/watchlist" onClick={() => setIsMobileMenuOpen(false)}>
                                <Button variant="outline" fullWidth>Watchlist</Button>
                            </Link>
                        )}
                        {user ? (
                            <>
                                <MobileSubscriptionCTA onClose={() => setIsMobileMenuOpen(false)} />
                                <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button variant="primary" fullWidth>My Profile</Button>
                                </Link>
                                <Button variant="ghost" fullWidth onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}>
                                    <LogOut size={18} className="mr-2" />
                                    Log Out
                                </Button>
                            </>
                        ) : (
                            <>
                                <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button variant="primary" fullWidth className={styles.getStartedBtn}>Get Started</Button>
                                </Link>
                                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button variant="ghost" fullWidth>Log In</Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <SearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
            />
        </>
    );
};

function SubscriptionCTA() {
    const { isPro, loading } = useSubscription();
    if (loading) return null;
    if (isPro) return <PremiumBadge size="sm" />;
    return (
        <Link href="/pricing">
            <Button variant="outline" size="sm" style={{ fontSize: '0.75rem', padding: '4px 12px' }}>
                Upgrade
            </Button>
        </Link>
    );
}

function MobileSubscriptionCTA({ onClose }: { onClose: () => void }) {
    const { isPro, loading } = useSubscription();
    if (loading || isPro) return null;
    return (
        <Link href="/pricing" onClick={onClose}>
            <Button variant="outline" fullWidth style={{ borderColor: 'rgba(202,255,0,0.3)', color: '#CAFF00' }}>
                Upgrade to Pro
            </Button>
        </Link>
    );
}
