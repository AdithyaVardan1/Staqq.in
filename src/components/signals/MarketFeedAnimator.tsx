'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { NewsCard } from './NewsCard';

interface MarketFeedAnimatorProps {
    heroPost: any;
    gridPosts: any[];
    styles: any;
}

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.12 }
    }
};

const itemVariants: any = {
    hidden: { opacity: 0, rotateX: -15, y: 20, filter: 'blur(4px)', transformPerspective: 1000 },
    show: { 
        opacity: 1, 
        rotateX: 0, 
        y: 0, 
        filter: 'blur(0px)',
        transition: { 
            duration: 0.9, 
            ease: [0.22, 1, 0.36, 1] as [number, number, number, number]
        }
    }
};

export function MarketFeedAnimator({ heroPost, gridPosts, styles }: MarketFeedAnimatorProps) {
    return (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            style={{ display: 'contents' }}
        >
            {heroPost && (
                <motion.div variants={itemVariants} className={styles.heroSlot}>
                    <NewsCard post={heroPost} size="hero" />
                </motion.div>
            )}

            <div className={styles.newsGrid}>
                {gridPosts.map((post: any) => (
                    <motion.div key={post.id} variants={itemVariants}>
                        <NewsCard post={post} />
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
