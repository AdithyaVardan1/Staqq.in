import { NextResponse } from 'next/server';
import { getAllPosts } from '@/lib/social';
import { createAdminClient } from '@/utils/supabase/admin';
import { cdnCache } from '@/lib/http-cache';

export const revalidate = 300;

export async function GET() {
    try {
        const [posts, spikesResult] = await Promise.all([
            getAllPosts(50),
            (async () => {
                const supabase = createAdminClient();
                const { data } = await supabase
                    .from('alerts')
                    .select('ticker, spike_mult, mention_count, message, detected_at, top_post_url')
                    .gte('detected_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
                    .order('spike_mult', { ascending: false })
                    .limit(5);
                return data ?? [];
            })(),
        ]);

        return NextResponse.json({ posts, spikes: spikesResult }, { headers: cdnCache(300) });
    } catch (error: any) {
        console.error('[PulseFeed] Error:', error.message);
        return NextResponse.json({ posts: [], spikes: [] }, { status: 500 });
    }
}
