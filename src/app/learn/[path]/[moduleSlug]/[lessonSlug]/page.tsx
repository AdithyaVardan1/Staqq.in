import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getModuleBySlug, modules } from "@/data/modules";
import styles from "./lesson.module.css";
import { MarkCompleteButton } from "@/components/MarkCompleteButton";
import { ReadingProgress } from "@/components/ReadingProgress/ReadingProgress";
import { LessonSidebar } from "@/components/LessonSidebar/LessonSidebar";
import { learnPaths, cryptoLearnPaths } from "@/data/learnPaths";

const allLearnPaths = { ...learnPaths, ...cryptoLearnPaths };

interface PageProps {
    params: Promise<{
        path: string;
        moduleSlug: string;
        lessonSlug: string;
    }>;
}

export default async function LessonPage({ params }: PageProps) {
    const { path: pathKey, moduleSlug, lessonSlug } = await params;

    const module = getModuleBySlug(moduleSlug);
    if (!module || module.path !== pathKey) notFound();

    const chapter = module.chapters.find((c) => c.slug === lessonSlug);
    if (!chapter) notFound();

    // Navigation logic
    const pathModules = modules.filter(m => m.path === pathKey).sort((a, b) => a.id - b.id);
    const currentModuleIndex = pathModules.findIndex(m => m.slug === moduleSlug);
    const currentChapterIndex = module.chapters.findIndex(c => c.slug === lessonSlug);

    let prevLesson = null;
    let nextLesson = null;

    if (currentChapterIndex > 0) {
        prevLesson = { moduleSlug, chapter: module.chapters[currentChapterIndex - 1] };
    } else if (currentModuleIndex > 0) {
        const prevModule = pathModules[currentModuleIndex - 1];
        if (prevModule.chapters.length > 0) {
            prevLesson = { moduleSlug: prevModule.slug, chapter: prevModule.chapters[prevModule.chapters.length - 1] };
        }
    }

    if (currentChapterIndex < module.chapters.length - 1) {
        nextLesson = { moduleSlug, chapter: module.chapters[currentChapterIndex + 1] };
    } else if (currentModuleIndex < pathModules.length - 1) {
        const nextModule = pathModules[currentModuleIndex + 1];
        if (nextModule.chapters.length > 0) {
            nextLesson = { moduleSlug: nextModule.slug, chapter: nextModule.chapters[0] };
        }
    }

    let Content;
    try {
        const mdx = await import(`@/chapters/${pathKey}/${moduleSlug}/${lessonSlug}.mdx`);
        Content = mdx.default;
    } catch {
        Content = null;
    }

    const pathTitle = allLearnPaths[pathKey as keyof typeof allLearnPaths]?.title ?? pathKey;

    // Build sidebar module data (all modules in path with their chapters)
    const sidebarModules = pathModules.map(m => ({
        slug: m.slug,
        title: m.title,
        chapters: m.chapters.map(c => ({ slug: c.slug, title: c.title })),
    }));

    return (
        <div className={styles.pageRoot}>
            <ReadingProgress />

            <LessonSidebar
                pathKey={pathKey}
                pathTitle={pathTitle}
                modules={sidebarModules}
                currentModuleSlug={moduleSlug}
                currentChapterSlug={lessonSlug}
            />

            <main className={styles.lessonMain}>
                {/* Breadcrumb */}
                <nav className={styles.breadcrumb}>
                    <Link href="/learn" className={styles.breadcrumbLink}>Learn</Link>
                    <span className={styles.breadcrumbSep}>/</span>
                    <Link href={`/learn/${pathKey}`} className={styles.breadcrumbLink}>{pathTitle}</Link>
                    <span className={styles.breadcrumbSep}>/</span>
                    <Link href={`/learn/${pathKey}/${moduleSlug}`} className={styles.breadcrumbLink}>{module.title}</Link>
                    <span className={styles.breadcrumbSep}>/</span>
                    <span className={styles.breadcrumbCurrent}>{chapter.title}</span>
                </nav>

                <article className={styles.prose}>
                    {Content ? (
                        <Content />
                    ) : (
                        <>
                            <h1>{chapter.title}</h1>
                            <div className={styles.placeholder}>
                                <p>This chapter is coming soon.</p>
                                <p><code>src/chapters/{pathKey}/{moduleSlug}/{lessonSlug}.mdx</code></p>
                            </div>
                        </>
                    )}

                    <div className={styles.completeRow}>
                        <MarkCompleteButton
                            path={pathKey}
                            moduleSlug={moduleSlug}
                            chapterSlug={lessonSlug}
                        />
                    </div>
                </article>

                <div className={styles.navigation}>
                    {prevLesson ? (
                        <Link href={`/learn/${pathKey}/${prevLesson.moduleSlug}/${prevLesson.chapter.slug}`} className={styles.navButton}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                            <div>
                                <span className={styles.navLabel}>Previous</span>
                                <span className={styles.navTitle}>{prevLesson.chapter.title}</span>
                            </div>
                        </Link>
                    ) : <div />}

                    {nextLesson ? (
                        <Link href={`/learn/${pathKey}/${nextLesson.moduleSlug}/${nextLesson.chapter.slug}`} className={`${styles.navButton} ${styles.navButtonNext}`}>
                            <div>
                                <span className={styles.navLabel}>Next</span>
                                <span className={styles.navTitle}>{nextLesson.chapter.title}</span>
                            </div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </Link>
                    ) : <div />}
                </div>
            </main>
        </div>
    );
}

export async function generateStaticParams() {
    const params: { path: string; moduleSlug: string; lessonSlug: string }[] = [];
    for (const module of modules) {
        for (const chapter of module.chapters) {
            params.push({ path: module.path, moduleSlug: module.slug, lessonSlug: chapter.slug });
        }
    }
    return params;
}
