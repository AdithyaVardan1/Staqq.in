'use client';

import { useEffect, useState } from 'react';
import styles from './ReadingProgress.module.css';

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function update() {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? Math.min(100, (scrolled / total) * 100) : 0);
    }

    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <div className={styles.track} aria-hidden>
      <svg className={styles.svg}>
        <rect
          x="1" y="1"
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          rx="28"
          pathLength="100"
          className={styles.rect}
          style={{ strokeDashoffset: 100 - progress }}
        />
      </svg>
    </div>
  );
}
