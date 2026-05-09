import { learnPaths, cryptoLearnPaths } from '@/data/learnPaths';

const allLearnPaths = { ...learnPaths, ...cryptoLearnPaths };
import ModulesAccordion from '@/components/ModulesAccordion';
import PathProgressBar from '@/components/PathProgressBar';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import styles from './page.module.css';

interface LearnPathPageProps {
  params: Promise<{ path: string }>;
}

const DIFF_STYLE: Record<string, { color: string; bg: string }> = {
  BEGINNER:     { color: '#b6ff00', bg: 'rgba(182,255,0,0.08)' },
  INTERMEDIATE: { color: '#ffcc00', bg: 'rgba(255,204,0,0.08)' },
  ADVANCED:     { color: '#ff6b35', bg: 'rgba(255,107,53,0.08)' },
};

export default async function LearnPathPage({ params }: LearnPathPageProps) {
  const { path } = await params;
  const pathData = allLearnPaths[path as keyof typeof allLearnPaths];

  if (!pathData) return <main style={{ padding: '3rem' }}>Path not found</main>;

  const totalLessons = pathData.modules.reduce((s, m) => s + m.chapterCount, 0);
  const ds = DIFF_STYLE[pathData.difficulty] ?? DIFF_STYLE.BEGINNER;

  return (
    <main className={styles.page}>
      <Link href="/learn" className={styles.back}>
        <ArrowLeft size={14} strokeWidth={2.5} />
        Learning Hub
      </Link>

      {/* Title row */}
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{pathData.title}</h1>
        <span className={styles.diffBadge} style={{ color: ds.color, background: ds.bg }}>
          {pathData.difficulty.charAt(0) + pathData.difficulty.slice(1).toLowerCase()}
        </span>
      </div>

      <p className={styles.desc}>{pathData.description}</p>

      {/* Meta + progress row */}
      <div className={styles.metaBar}>
        <span className={styles.metaItem}>{pathData.modules.length} modules</span>
        <span className={styles.metaDot} />
        <span className={styles.metaItem}>{totalLessons} lessons</span>
        <span className={styles.metaDot} />
        <span className={styles.metaItem}>{pathData.estimatedTime}</span>
        <div className={styles.metaSpacer} />
        <div className={styles.progressInline}>
          <PathProgressBar pathKey={path} totalLessons={totalLessons} />
        </div>
      </div>

      <div className={styles.divider} />

      {/* Module list */}
      <ModulesAccordion modules={pathData.modules} pathKey={path} accentColor={pathData.color} />
    </main>
  );
}
