import { NextRequest, NextResponse } from 'next/server';
import { getAllIPOs } from '@/lib/ipo';
import { generateIPOAnalysis, generateWeeklyRoundup } from '@/lib/blogGenerator';
import { createAdminClient } from '@/utils/supabase/admin';
import { verifyCronRequest } from '@/lib/cron-auth';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    if (!(await verifyCronRequest(req))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabase = createAdminClient();
        const allIPOs = await getAllIPOs();

        // Generate posts for Live and Upcoming IPOs (these are the ones people search for)
        const activeIPOs = allIPOs.filter(
            ipo => ipo.status === 'Live' || ipo.status === 'Upcoming'
        );

        // Also include recently listed (last 10) for post-listing analysis
        const recentlyListed = allIPOs
            .filter(ipo => ipo.status === 'Listed')
            .slice(0, 10);

        const iposToProcess = [...activeIPOs, ...recentlyListed];

        let created = 0;
        let updated = 0;
        let errors = 0;

        // Generate/update individual IPO analysis posts
        for (const ipo of iposToProcess) {
            try {
                const post = generateIPOAnalysis(ipo);

                const { data: existing } = await supabase
                    .from('blog_posts')
                    .select('id')
                    .eq('ipo_slug', ipo.slug)
                    .maybeSingle();

                if (existing) {
                    // Update existing post with fresh data
                    await supabase
                        .from('blog_posts')
                        .update({
                            title: post.title,
                            description: post.description,
                            content: post.content,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', existing.id);
                    updated++;
                } else {
                    // Create new post
                    await supabase
                        .from('blog_posts')
                        .insert(post);
                    created++;
                }
            } catch (err: any) {
                console.error(`[BlogGen] Failed for ${ipo.name}:`, err.message);
                errors++;
            }
        }

        // Generate weekly roundup (upsert by slug pattern)
        try {
            const roundup = generateWeeklyRoundup(allIPOs);
            const { data: existingRoundup } = await supabase
                .from('blog_posts')
                .select('id')
                .eq('slug', roundup.slug)
                .maybeSingle();

            if (existingRoundup) {
                await supabase
                    .from('blog_posts')
                    .update({
                        title: roundup.title,
                        description: roundup.description,
                        content: roundup.content,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existingRoundup.id);
                updated++;
            } else {
                await supabase
                    .from('blog_posts')
                    .insert(roundup);
                created++;
            }
        } catch (err: any) {
            console.error('[BlogGen] Weekly roundup failed:', err.message);
            errors++;
        }

        console.log(`[BlogGen] Done. Created: ${created}, Updated: ${updated}, Errors: ${errors}`);

        return NextResponse.json({
            processed: iposToProcess.length,
            created,
            updated,
            errors,
        });
    } catch (error: any) {
        console.error('[BlogGen] Fatal error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
