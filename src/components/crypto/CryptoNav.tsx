'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Zap, Wallet, Shield, Rocket } from 'lucide-react';
import styles from './CryptoNav.module.css';

const TABS = [
    { href: '/crypto/signals',    label: 'Social Signals', icon: Zap },
    { href: '/crypto/wallets',    label: 'Wallet Tracker', icon: Wallet },
    { href: '/crypto/scanner',    label: 'Token Scanner',  icon: Shield },
    { href: '/crypto/new-tokens', label: 'New Launches',   icon: Rocket },
];

export function CryptoNav() {
    const pathname = usePathname();

    return (
        <nav className={styles.nav}>
            {TABS.map(tab => {
                const active = pathname.startsWith(tab.href);
                const Icon = tab.icon;
                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        className={`${styles.tab} ${active ? styles.active : ''}`}
                    >
                        {active && (
                            <motion.div
                                layoutId="activeCryptoTab"
                                className={styles.activeBg}
                                initial={false}
                                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                            />
                        )}
                        <Icon size={15} className={styles.tabIcon} />
                        {tab.label}
                    </Link>
                );
            })}
        </nav>
    );
}
