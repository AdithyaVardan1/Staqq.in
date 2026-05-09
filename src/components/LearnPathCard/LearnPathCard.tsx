import Link from "next/link";
import styles from "./LearnPathCard.module.css";
import type { Difficulty } from "@/data/learnPaths";

interface LearningPathCardProps {
  title: string;
  description: string;
  modules: number;
  progress: number;
  slug: string;
  difficulty: Difficulty;
  estimatedTime: string;
  icon: string;
  color: string;
  firstLesson?: string;
  featured?: boolean;
}

function PathIcon({ name }: { name: string }) {
  switch (name) {
    case "sprout":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22V12" />
          <path d="M12 12C12 7 8 4 4 4c0 4 2.5 8 8 8z" />
          <path d="M12 12c0-5 4-8 8-8 0 4-2.5 8-8 8z" />
        </svg>
      );
    case "chart-bar":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="12" width="4" height="9" rx="1" />
          <rect x="10" y="7" width="4" height="14" rx="1" />
          <rect x="17" y="3" width="4" height="18" rx="1" />
        </svg>
      );
    case "chart-candlestick":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <line x1="6" y1="2" x2="6" y2="22" />
          <rect x="4" y="6" width="4" height="8" rx="1" />
          <line x1="14" y1="4" x2="14" y2="20" />
          <rect x="12" y="8" width="4" height="7" rx="1" />
        </svg>
      );
    case "rocket":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2l3-3-3-3-3 3z" />
          <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        </svg>
      );
    case "building":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
          <path d="M9 21V9" />
          <rect x="13" y="13" width="3" height="3" />
          <rect x="5" y="13" width="3" height="3" />
          <rect x="5" y="5" width="3" height="2" />
          <rect x="11" y="5" width="3" height="2" />
          <rect x="17" y="5" width="2" height="2" />
        </svg>
      );
    case "bitcoin":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 5.24m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727" />
        </svg>
      );
    case "network":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="2" />
          <circle cx="5" cy="19" r="2" />
          <circle cx="19" cy="19" r="2" />
          <path d="M12 7v4M10.5 17.5l-3.5-1M13.5 17.5l3.5-1M10 15l-3 2.5M14 15l3 2.5" />
          <line x1="12" y1="11" x2="7" y2="17" />
          <line x1="12" y1="11" x2="17" y2="17" />
        </svg>
      );
    case "defi":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4l3 3" />
        </svg>
      );
  }
}

const DIFF_LABEL: Record<Difficulty, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

const DIFF_STYLE: Record<Difficulty, { color: string; bg: string }> = {
  BEGINNER:     { color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  INTERMEDIATE: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  ADVANCED:     { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

export default function LearningPathCard({
  title, description, modules, progress, slug, difficulty,
  estimatedTime, icon, color, firstLesson, featured = false,
}: LearningPathCardProps) {
  const ds = DIFF_STYLE[difficulty];

  if (featured) {
    return (
      <Link
        href={`/learn/${slug}`}
        className={styles.featuredCard}
        style={{ "--accent": color } as React.CSSProperties}
      >
        {/* Top row: START HERE + diff badge */}
        <div className={styles.featuredTopRow}>
          <span className={styles.startHereBadge}>⭐ Start Here</span>
          <span className={styles.diffBadge} style={{ color: ds.color, background: ds.bg }}>
            {DIFF_LABEL[difficulty]}
          </span>
        </div>

        {/* Content row */}
        <div className={styles.featuredBody}>
          <div className={styles.featuredLeft}>
            <div className={styles.iconWrapLg}>
              <PathIcon name={icon} />
            </div>
            <div>
              <h3 className={styles.featuredTitle}>{title}</h3>
              <p className={styles.featuredDesc}>{description}</p>
              <div className={styles.meta}>
                <span className={styles.metaItem}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                  </svg>
                  {modules} modules
                </span>
                <span className={styles.metaItem}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  {estimatedTime}
                </span>
              </div>
              {firstLesson && progress === 0 && (
                <p className={styles.teaser}>
                  Start with: <span className={styles.teaserLesson}>{firstLesson}</span>
                </p>
              )}
            </div>
          </div>

          <div className={styles.featuredRight}>
            {progress > 0 ? (
              <div className={styles.featuredProgress}>
                <div className={styles.progressLabel}>
                  <span>Progress</span><span>{progress}%</span>
                </div>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                </div>
                <span className={styles.featuredCta}>Continue →</span>
              </div>
            ) : (
              <span className={styles.featuredCta}>Start Learning →</span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/learn/${slug}`}
      className={styles.card}
      style={{ "--accent": color } as React.CSSProperties}
    >
      <div className={styles.topRow}>
        <div className={styles.iconWrap}>
          <PathIcon name={icon} />
        </div>
        <span className={styles.diffBadge} style={{ color: ds.color, background: ds.bg }}>
          {DIFF_LABEL[difficulty]}
        </span>
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.desc}>{description}</p>
      </div>

      <div className={styles.meta}>
        <span className={styles.metaItem}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
          </svg>
          {modules} modules
        </span>
        <span className={styles.metaItem}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          {estimatedTime}
        </span>
      </div>

      {firstLesson && progress === 0 && (
        <div className={styles.teaser}>
          Start with: <span className={styles.teaserLesson}>{firstLesson}</span>
        </div>
      )}

      {progress > 0 && (
        <div className={styles.progressSection}>
          <div className={styles.progressLabel}>
            <span>Progress</span><span>{progress}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </Link>
  );
}
