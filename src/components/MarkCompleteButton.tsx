"use client";

import { useProgress } from "@/hooks/useProgress";
import styles from "./MarkCompleteButton.module.css";

interface MarkCompleteButtonProps {
    path: string;
    moduleSlug: string;
    chapterSlug: string;
}

export function MarkCompleteButton({
    path,
    moduleSlug,
    chapterSlug,
}: MarkCompleteButtonProps) {
    const { markLessonComplete, isLessonComplete, isLoaded } = useProgress();

    if (!isLoaded) {
        return null;
    }

    const isComplete = isLessonComplete(path, moduleSlug, chapterSlug);

    const handleClick = () => {
        if (!isComplete) {
            markLessonComplete(path, moduleSlug, chapterSlug);
        }
    };

    return (
        <button
            className={`${styles.button} ${isComplete ? styles.completed : ""}`}
            onClick={handleClick}
            disabled={isComplete}
        >
            {isComplete ? (
                <>
                    <span className={styles.checkmark}>✓</span>
                    <span>Completed</span>
                </>
            ) : (
                <span>Mark as Complete</span>
            )}
        </button>
    );
}
