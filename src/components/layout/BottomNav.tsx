'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    Home, 
    TrendingUp,
    Zap, 
    Coins,
    MoreHorizontal,
    X,
    PlusSquare,
    Bell,
    BookOpen,
    User,
    Search,
    Star,
    GraduationCap,
    Building2,
    BarChart3
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { SearchModal } from './SearchModal';
import { Button } from '@/components/ui/Button';
import { useSubscription } from '@/hooks/useSubscription';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import styles from './BottomNav.module.css';

export const BottomNav = () => {
    const pathname = usePathname();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const { isPro, loading } = useSubscription();

    const primaryItems = [
        { name: 'Home', href: '/', icon: <Home size={22} /> },
        { name: 'Stocks', href: '/stocks/screener', icon: <TrendingUp size={22} /> },
        { name: 'Intel', href: '/signals', icon: <Zap size={22} /> },
        { name: 'Crypto', href: '/crypto', icon: <Coins size={22} /> },
    ];

    const secondaryItems = [
        { name: 'IPO Hub', href: '/ipo', icon: <PlusSquare size={20} /> },
        { name: 'Watchlist', href: '/watchlist', icon: <Star size={20} /> },
        { name: 'Alerts', href: '/alerts', icon: <Bell size={20} /> },
        { name: 'Learn', href: '/learn', icon: <GraduationCap size={20} /> },
        { name: 'Blog', href: '/blog', icon: <BookOpen size={20} /> },
        { name: 'Profile', href: '/profile', icon: <User size={20} /> },
    ];

    const intelItems = [
        { name: 'FII / DII', href: '/signals/fii-dii', icon: <TrendingUp size={18} /> },
        { name: 'Insiders', href: '/signals/insider-trades', icon: <Building2 size={18} /> },
        { name: 'Bulk Deals', href: '/signals/bulk-deals', icon: <BarChart3 size={18} /> },
        { name: 'Social', href: '/signals', icon: <Zap size={18} /> },
    ];

    return (
        <>
        <nav className={styles.bottomNav}>
            <div className={styles.inner}>
                {primaryItems.map((item) => {
                    const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(styles.navItem, active && styles.active)}
                        >
                            <div className={styles.iconWrapper}>{item.icon}</div>
                            <span className={styles.label}>{item.name}</span>
                        </Link>
                    );
                })}
                
                <button 
                    className={clsx(styles.navItem, isMenuOpen && styles.active)}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    <div className={styles.iconWrapper}>
                        {isMenuOpen ? <X size={22} /> : <MoreHorizontal size={22} />}
                    </div>
                    <span className={styles.label}>{isMenuOpen ? 'Close' : 'More'}</span>
                </button>
            </div>

            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div 
                        className={styles.menuOverlay}
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        <div className={styles.menuHeader}>
                            <h3>Platform Directory</h3>
                            {!loading && !isPro && (
                                <Link href="/pricing" onClick={() => setIsMenuOpen(false)}>
                                    <Button variant="outline" size="sm" className={styles.upgradeBtn}>Upgrade</Button>
                                </Link>
                            )}
                            {isPro && <PremiumBadge size="sm" />}
                        </div>
                        <div className={styles.menuGrid}>
                            {secondaryItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={styles.menuItem}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <div className={styles.menuIcon}>{item.icon}</div>
                                    <span className={styles.menuLabel}>{item.name}</span>
                                </Link>
                            ))}
                        </div>

                        <div className={styles.menuSectionTitle}>Market Intelligence</div>
                        <div className={styles.menuGrid}>
                            {intelItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={styles.menuItem}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <div className={styles.menuIcon}>{item.icon}</div>
                                    <span className={styles.menuLabel}>{item.name}</span>
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <SearchModal 
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
            />
        </nav>
        <button 
            className={styles.searchFab}
            onClick={() => setIsSearchOpen(true)}
        >
            <Search size={20} />
        </button>
        </>
    );
};
