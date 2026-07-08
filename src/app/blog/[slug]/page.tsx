import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, Calendar, RefreshCw } from 'lucide-react';
import type { Metadata } from 'next';
import styles from './page.module.css';

export const revalidate = 300;

interface Props {
    params: Promise<{ slug: string }>;
}

async function getPost(slug: string) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data, error } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('slug', slug)
            .maybeSingle();

        if (error || !data) return null;
        return data;
    } catch {
        return null;
    }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPost(slug);
    if (!post) return { title: 'Post Not Found' };

    return {
        title: `${post.title} | Staqq Blog`,
        description: post.description,
        openGraph: {
            title: post.title,
            description: post.description,
            type: 'article',
            publishedTime: post.published_at,
            modifiedTime: post.updated_at,
        },
    };
}

export default async function BlogPostPage({ params }: Props) {
    const { slug } = await params;
    const post = await getPost(slug);

    if (!post) notFound();

    const publishedDate = new Date(post.published_at).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
    });
    const updatedDate = new Date(post.updated_at).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
    });
    const wasUpdated = post.updated_at !== post.published_at;

    return (
        <main className={styles.main}>
            <div className="container">
                <Link href="/blog" className={styles.backLink}>
                    <ArrowLeft size={16} /> All Posts
                </Link>

                <article className={styles.article}>
                    <header className={styles.header}>
                        <span className={styles.badge}>
                            {post.category === 'weekly-roundup' ? 'Weekly Roundup' : 'IPO Analysis'}
                        </span>
                        <h1 className={styles.title}>{post.title}</h1>
                        <p className={styles.description}>{post.description}</p>
                        <div className={styles.meta}>
                            <span className={styles.metaItem}>
                                <Calendar size={14} /> {publishedDate}
                            </span>
                            {wasUpdated && (
                                <span className={styles.metaItem}>
                                    <RefreshCw size={14} /> Updated {updatedDate}
                                </span>
                            )}
                        </div>
                    </header>

                    <div className={styles.content}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
                    </div>

                    {post.ipo_slug && (
                        <div className={styles.cta}>
                            <Link href={`/ipo/${post.ipo_slug}`} className={styles.ctaBtn}>
                                View Live IPO Data
                            </Link>
                        </div>
                    )}
                </article>
            </div>
        </main>
    );
}
