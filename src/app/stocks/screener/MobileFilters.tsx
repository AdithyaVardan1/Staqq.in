'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, SlidersHorizontal, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import clsx from 'clsx';
import styles from './MobileFilters.module.css';

interface Filters {
    priceRange: number;
    mcap: string;
    sector: string;
    return1Y: string;
}

interface MobileFiltersProps {
    filters: Filters;
    setFilters: React.Dispatch<React.SetStateAction<Filters>>;
    activeFilterCount: number;
    initialFilters: Filters;
    sectors: { value: string, label: string }[];
}

export const MobileFilters = ({ 
    filters, 
    setFilters, 
    activeFilterCount, 
    initialFilters,
    sectors 
}: MobileFiltersProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const toggle = () => setIsOpen(!isOpen);

    const pill = (label: string, value: string, field: keyof Filters) => (
        <button
            key={value}
            className={clsx(styles.pill, filters[field] === value && styles.pillActive)}
            onClick={() => setFilters(prev => ({ ...prev, [field]: value }))}
        >
            {label}
        </button>
    );

    return (
        <>
            <button className={styles.mobileFilterBtn} onClick={toggle}>
                <SlidersHorizontal size={18} />
                <span>Filters</span>
                {activeFilterCount > 0 && <span className={styles.badge}>{activeFilterCount}</span>}
            </button>

            {mounted && createPortal(
                <div className={clsx(styles.drawer, isOpen && styles.drawerOpen)}>
                    <div className={styles.overlay} onClick={toggle} />
                    <div className={styles.content}>
                        <div className={styles.header}>
                            <div className={styles.headerTitle}>
                                <SlidersHorizontal size={18} />
                                <span>Filters</span>
                                {activeFilterCount > 0 && <span className={styles.countBadge}>{activeFilterCount}</span>}
                            </div>
                            <button className={styles.closeBtn} onClick={toggle}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className={styles.body}>
                            {/* Price Range */}
                            <div className={styles.section}>
                                <div className={styles.label}>
                                    Price Range
                                    <span className={styles.val}>
                                        {filters.priceRange >= 10000 ? 'Any' : `≤ ₹${filters.priceRange.toLocaleString()}`}
                                    </span>
                                </div>
                                <input
                                    type="range" min="0" max="10000" step="500"
                                    className={styles.range}
                                    value={filters.priceRange}
                                    onChange={e => setFilters(prev => ({ ...prev, priceRange: parseInt(e.target.value) }))}
                                />
                                <div className={styles.rangeLabels}><span>₹0</span><span>₹10k+</span></div>
                            </div>

                            {/* Market Cap */}
                            <div className={styles.section}>
                                <div className={styles.label}>Market Cap</div>
                                <div className={styles.pillRow}>
                                    {pill('Any', 'all', 'mcap')}
                                    {pill('Large', 'large', 'mcap')}
                                    {pill('Mid', 'mid', 'mcap')}
                                    {pill('Small', 'small', 'mcap')}
                                </div>
                            </div>

                            {/* Sector */}
                            <div className={styles.section}>
                                <div className={styles.label}>Sector</div>
                                <div className={styles.selectWrap}>
                                    <select
                                        className={styles.select}
                                        value={filters.sector}
                                        onChange={e => setFilters(prev => ({ ...prev, sector: e.target.value }))}
                                    >
                                        {sectors.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                    <ChevronRight className={styles.selectIcon} size={16} />
                                </div>
                            </div>

                            {/* 1Y Return */}
                            <div className={styles.section}>
                                <div className={styles.label}>1Y Return</div>
                                <div className={styles.pillRow}>
                                    {pill('Any', 'all', 'return1Y')}
                                    {pill('+ve', 'positive', 'return1Y')}
                                    {pill('>10%', 'top10', 'return1Y')}
                                    {pill('>30%', 'top30', 'return1Y')}
                                </div>
                            </div>
                        </div>

                        <div className={styles.footer}>
                            <Button 
                                variant="ghost" 
                                fullWidth 
                                onClick={() => { setFilters(initialFilters); toggle(); }}
                            >
                                Reset All
                            </Button>
                            <Button 
                                variant="primary" 
                                fullWidth 
                                onClick={toggle}
                            >
                                Apply Filters
                            </Button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};
