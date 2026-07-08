import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { randomUUID } from 'node:crypto';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, email, category, rating, message, pageUrl } = body;

        if (!category || !rating || !message) {
            return NextResponse.json(
                { error: 'Category, rating, and message are required.' },
                { status: 400 }
            );
        }

        const id = randomUUID();
        const feedback = {
            id,
            name: name || 'Anonymous',
            email: email || null,
            category,
            rating: Number(rating),
            message,
            page_url: pageUrl || null,
            created_at: new Date().toISOString()
        };

        // Store in a Redis List for easy retrieval
        await redis.lpush('user_feedback_list', JSON.stringify(feedback));

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('[Feedback API] Error:', e.message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
