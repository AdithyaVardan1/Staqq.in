"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { GraduationCap, Library, BookOpen } from "lucide-react";
import styles from "./page.module.css";
import LearningPathCard from "@/components/LearnPathCard/LearnPathCard";
import { learnPaths, cryptoLearnPaths } from "@/data/learnPaths";
import { useProgress } from "@/hooks/useProgress";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const cardVariant: any = {
  hidden: { opacity: 0, y: 18, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

type Tab = "stocks" | "crypto";

const TAB_META = {
  stocks: { label: "Stocks & Investing", tracks: "5", lessons: "83", color: "#b6ff00" },
  crypto: { label: "Crypto & Web3", tracks: "5", lessons: "45", color: "#f7931a" },
};

export default function LearnPage() {
  const [activeTab, setActiveTab] = useState<Tab>("stocks");

  const {
    getCompletedCountForPath,
    getCompletedCountForModule,
    isLoaded,
    totalCompleted,
    currentStreak,
  } = useProgress();

  const activePaths = activeTab === "stocks" ? learnPaths : cryptoLearnPaths;
  const featuredKey = activeTab === "stocks" ? "beginner" : "crypto-101";

  // Find first in-progress track in the active set
  const inProgressEntry = isLoaded
    ? Object.entries(activePaths).find(([key, path]) => {
        const total = path.modules.reduce((s, m) => s + m.chapterCount, 0);
        const done = getCompletedCountForPath(key);
        return done > 0 && done < total;
      })
    : null;

  let inProgressModuleName: string | null = null;
  if (inProgressEntry) {
    const [key, path] = inProgressEntry;
    const mod =
      path.modules.find((m) => {
        const done = getCompletedCountForModule(key, m.slug);
        return done > 0 && done < m.chapterCount;
      }) ?? path.modules.find((m) => getCompletedCountForModule(key, m.slug) < m.chapterCount);
    inProgressModuleName = mod?.title ?? null;
  }

  const isNewUser = isLoaded && totalCompleted === 0;

  const pathEntries = Object.entries(activePaths);
  const featuredEntry = pathEntries.find(([key]) => key === featuredKey)!;
  const restEntries = pathEntries.filter(([key]) => key !== featuredKey);

  function cardProps(key: string, path: (typeof learnPaths)[string]) {
    const total = path.modules.reduce((s, m) => s + m.chapterCount, 0);
    const completed = isLoaded ? getCompletedCountForPath(key) : 0;
    return {
      title: path.title,
      description: path.description,
      modules: path.modules.length,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      slug: key,
      difficulty: path.difficulty,
      estimatedTime: path.estimatedTime,
      icon: path.icon,
      color: path.color,
      firstLesson: path.modules[0]?.firstLesson?.title,
    };
  }

  const meta = TAB_META[activeTab];

  return (
    <main className={styles.page}>
      <div className={styles.bgGlow1} aria-hidden />
      <div className={styles.bgGlow2} aria-hidden />

      {/* ── Page header ── */}
      <motion.div
        className={styles.pageHeader}
        initial={{ opacity: 0, y: 28, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
      >
        <div className={styles.headerLeft}>
          {isLoaded && currentStreak > 0 ? (
            <div className={`${styles.headerBadge} ${styles.streakBadge}`}>
              🔥 {currentStreak}-DAY STREAK
            </div>
          ) : (
            <div className={styles.headerBadge}>
              <span className={styles.badgeDot} />
              LEARNING HUB · FREE
            </div>
          )}
          <h1 className={styles.title}>
            Learning<br />
            <span className={styles.accent}>Hub.</span>
          </h1>
          <p className={styles.subtitle}>
            Built for Indian investors who want to actually understand markets — not just follow tips.
          </p>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.statChip} style={{ gridColumn: '1 / -1' }}>
            <GraduationCap size={13} className={styles.chipIcon} style={{ color: '#22c55e' }} />
            <span className={styles.chipNum}>Free</span>
            <span className={styles.chipLabel}>Forever</span>
          </div>
          <div className={styles.statChip}>
            <Library size={13} className={styles.chipIcon} style={{ color: '#f59e0b' }} />
            <span className={styles.chipNum}>{meta.tracks}</span>
            <span className={styles.chipLabel}>Tracks</span>
          </div>
          <div className={styles.statChip}>
            <BookOpen size={13} className={styles.chipIcon} style={{ color: '#a78bfa' }} />
            <span className={styles.chipNum}>{meta.lessons}</span>
            <span className={styles.chipLabel}>Lessons</span>
          </div>
        </div>
      </motion.div>

      {/* ── Toggle ── */}
      <motion.div
        className={styles.toggleWrap}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
      >
        <div className={styles.toggle}>
          <button
            className={`${styles.toggleBtn} ${activeTab === "stocks" ? styles.toggleActive : ""}`}
            onClick={() => setActiveTab("stocks")}
            style={activeTab === "stocks" ? { "--tab-color": TAB_META.stocks.color } as React.CSSProperties : {}}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Stocks &amp; Investing
          </button>
          <button
            className={`${styles.toggleBtn} ${activeTab === "crypto" ? styles.toggleActive : ""}`}
            onClick={() => setActiveTab("crypto")}
            style={activeTab === "crypto" ? { "--tab-color": TAB_META.crypto.color } as React.CSSProperties : {}}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 5.24m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727" />
            </svg>
            Crypto &amp; Web3
          </button>
        </div>
      </motion.div>

      {/* ── Progress banner ── */}
      {isLoaded && inProgressEntry && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        >
          {(() => {
            const [key, path] = inProgressEntry;
            const total = path.modules.reduce((s, m) => s + m.chapterCount, 0);
            const done = getCompletedCountForPath(key);
            const pct = Math.round((done / total) * 100);
            return (
              <div className={styles.progressCard}>
                <div className={styles.progressCardLeft}>
                  <div className={styles.progressCardTitle}>Continue where you left off</div>
                  <div className={styles.progressCardTrack}>
                    {path.title}
                    {inProgressModuleName && (
                      <span className={styles.progressCardModule}> · {inProgressModuleName}</span>
                    )}
                  </div>
                  <div className={styles.progressBarWrap}>
                    <div className={styles.progressBar}>
                      <div className={styles.progressBarFill} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={styles.progressPct}>{pct}%</span>
                  </div>
                  {currentStreak > 0 && (
                    <span className={styles.streakInline}>🔥 {currentStreak}-day streak</span>
                  )}
                </div>
                <Link href={`/learn/${key}`} className={styles.continueBtn}>
                  Continue →
                </Link>
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* New user nudge — only on stocks tab */}
      {isNewUser && activeTab === "stocks" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        >
          <Link href="/learn/beginner" className={styles.nudge}>
            <span className={styles.nudgeIcon}>👋</span>
            <span className={styles.nudgeText}>
              New here? <strong>Absolute Beginner</strong> is the right place to start — 15 lessons, no prior knowledge needed.
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </motion.div>
      )}

      {isNewUser && activeTab === "crypto" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        >
          <Link href="/learn/crypto-101" className={styles.nudge} style={{ "--nudge-accent": "#f7931a" } as React.CSSProperties}>
            <span className={styles.nudgeIcon}>₿</span>
            <span className={styles.nudgeText}>
              New to crypto? <strong>Crypto 101</strong> starts from zero — no jargon, just the essentials.
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </motion.div>
      )}

      {/* ── Cards grid ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          className={styles.grid}
          variants={container}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, y: -8, transition: { duration: 0.18 } }}
        >
          <motion.div key={featuredEntry[0]} variants={cardVariant} className={styles.featuredSlot}>
            <LearningPathCard
              {...cardProps(featuredEntry[0], featuredEntry[1])}
              featured
            />
          </motion.div>

          {restEntries.map(([key, path]) => (
            <motion.div key={key} variants={cardVariant}>
              <LearningPathCard {...cardProps(key, path)} />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
