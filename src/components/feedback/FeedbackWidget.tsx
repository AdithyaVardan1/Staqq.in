'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, CheckCircle2, AlertCircle, Sparkles, Star } from 'lucide-react';
import styles from './FeedbackWidget.module.css';

const CATEGORIES = [
    { value: 'bug', label: '🐛 Bug', desc: 'Something is broken' },
    { value: 'feature', label: '💡 Idea', desc: 'Suggest a feature' },
    { value: 'ux', label: '✨ Design', desc: 'UX or visual issue' },
    { value: 'general', label: '💬 General', desc: 'Anything else' },
];

export function FeedbackWidget() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [category, setCategory] = useState('general');
    const [rating, setRating] = useState<number | null>(null);
    const [hoveredRating, setHoveredRating] = useState<number | null>(null);
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isScrolled, setIsScrolled] = useState(false);

    // Collapse pill label on scroll
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 120);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close when navigating to a different page
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rating) { setError('Please give a star rating'); return; }
        if (!message.trim()) { setError('Please write a message'); return; }

        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/api/user/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category,
                    rating,
                    message,
                    pageUrl: window.location.href,
                }),
            });

            if (!res.ok) throw new Error('Failed to submit feedback. Please try again.');
            setIsSuccess(true);
            setCategory('general');
            setRating(null);
            setMessage('');
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setTimeout(() => {
            setIsSuccess(false);
            setError(null);
        }, 350);
    };

    const displayRating = hoveredRating ?? rating ?? 0;

    return (
        <div className={styles.widgetContainer}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className={styles.feedbackCard}
                        initial={{ opacity: 0, y: 16, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.96 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {/* Decorative top glow */}
                        <div className={styles.cardGlow} />

                        {/* Header */}
                        <div className={styles.cardHeader}>
                            <div className={styles.headerLeft}>
                                <div className={styles.headerIcon}>
                                    <Sparkles size={14} />
                                </div>
                                <div>
                                    <h3 className={styles.title}>Share Feedback</h3>
                                    <p className={styles.subtitle}>
                                        Help us build a better Staqq
                                    </p>
                                </div>
                            </div>
                            <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">
                                <X size={15} />
                            </button>
                        </div>

                        {/* Content */}
                        {isSuccess ? (
                            <motion.div
                                className={styles.successState}
                                initial={{ opacity: 0, scale: 0.92 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className={styles.successRocket}>🚀</div>
                                <h4 className={styles.successTitle}>You're awesome!</h4>
                                <p className={styles.successText}>
                                    Your feedback helps us make Staqq better for every investor.
                                </p>
                                <button className={styles.okBtn} onClick={handleClose}>
                                    <CheckCircle2 size={14} /> Close
                                </button>
                            </motion.div>
                        ) : (
                            <form onSubmit={handleSubmit} className={styles.form}>
                                {/* Category chips */}
                                <div className={styles.formGroup}>
                                    <div className={styles.categoryGrid}>
                                        {CATEGORIES.map((cat) => (
                                            <button
                                                key={cat.value}
                                                type="button"
                                                className={`${styles.catChip} ${category === cat.value ? styles.catChipActive : ''}`}
                                                onClick={() => setCategory(cat.value)}
                                            >
                                                <span className={styles.catLabel}>{cat.label}</span>
                                                <span className={styles.catDesc}>{cat.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Star rating */}
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Your experience</label>
                                    <div className={styles.starRow}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                className={`${styles.starBtn} ${star <= displayRating ? styles.starActive : ''}`}
                                                onMouseEnter={() => setHoveredRating(star)}
                                                onMouseLeave={() => setHoveredRating(null)}
                                                onClick={() => setRating(star)}
                                                aria-label={`Rate ${star} stars`}
                                            >
                                                <Star size={22} fill={star <= displayRating ? 'currentColor' : 'none'} />
                                            </button>
                                        ))}
                                        <span className={styles.starLabel}>
                                            {displayRating === 0 && 'Tap to rate'}
                                            {displayRating === 1 && 'Not good 😞'}
                                            {displayRating === 2 && 'Could be better 😕'}
                                            {displayRating === 3 && 'It\'s okay 😐'}
                                            {displayRating === 4 && 'Pretty good 🙂'}
                                            {displayRating === 5 && 'Love it! 😄'}
                                        </span>
                                    </div>
                                </div>

                                {/* Message */}
                                <div className={styles.formGroup}>
                                    <label htmlFor="fb-msg" className={styles.label}>
                                        Tell us more
                                    </label>
                                    <textarea
                                        id="fb-msg"
                                        className={styles.textarea}
                                        placeholder="Describe your experience, issue, or idea..."
                                        rows={3}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        required
                                    />
                                    <div className={styles.charCount}>
                                        {message.length}/500
                                    </div>
                                </div>

                                {/* Page context pill */}
                                <div className={styles.pageContext}>
                                    <span className={styles.pageContextDot} />
                                    Sending from: <code>{pathname}</code>
                                </div>

                                {error && (
                                    <div className={styles.errorBanner}>
                                        <AlertCircle size={13} />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <span className={styles.submittingDots}>Sending<span>.</span><span>.</span><span>.</span></span>
                                    ) : (
                                        <>Send Feedback <Send size={13} /></>
                                    )}
                                </button>
                            </form>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Pill trigger button */}
            <motion.button
                className={`${styles.triggerButton} ${isScrolled ? styles.triggerCollapsed : ''} ${isOpen ? styles.triggerOpen : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                aria-label="Open feedback widget"
            >
                <span className={styles.triggerIcon}>
                    {isOpen ? <X size={16} /> : <Sparkles size={16} />}
                </span>
                <AnimatePresence>
                    {!isOpen && !isScrolled && (
                        <motion.span
                            className={styles.triggerLabel}
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            Feedback
                        </motion.span>
                    )}
                </AnimatePresence>
                {/* Pulse dot */}
                {!isOpen && <span className={styles.pulseDot} />}
            </motion.button>
        </div>
    );
}
