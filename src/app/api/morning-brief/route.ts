import { NextRequest, NextResponse } from 'next/server';
import { generateMorningBrief } from '@/lib/morningBrief';
import { buildMorningBriefEmail } from '@/lib/emailTemplates/morningBrief';
import { getEmailProvider } from '@/lib/email';
import { createAdminClient } from '@/utils/supabase/admin';
import { verifyCronRequest } from '@/lib/cron-auth';

export const maxDuration = 60;

const FROM = process.env.EMAIL_FROM ?? 'Staqq <morning@staqq.in>';

export async function POST(req: NextRequest) {
    if (!(await verifyCronRequest(req))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. Generate the morning brief
        const brief = await generateMorningBrief();
        const html = buildMorningBriefEmail(brief);
        const subject = `Staqq Morning Brief   ${brief.date}`;

        // 2. Fetch all Pro subscribers with their email from profiles
        const supabase = createAdminClient();
        const { data: subscribers, error: subError } = await supabase
            .from('subscriptions')
            .select('user_id, profiles!inner(email)')
            .eq('status', 'active')
            .eq('plan', 'pro');

        if (subError) {
            console.error('[MorningBrief] Failed to fetch subscribers:', subError.message);
            return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 });
        }

        if (!subscribers || subscribers.length === 0) {
            console.log('[MorningBrief] No active Pro subscribers found');
            return NextResponse.json({
                subscriberCount: 0,
                emailsSent: 0,
                errors: 0,
                message: 'No active Pro subscribers',
            });
        }

        // 3. Send emails
        const emailProvider = getEmailProvider();
        let emailsSent = 0;
        let errors = 0;

        const results = await Promise.allSettled(
            subscribers.map(async (sub: any) => {
                const email = sub.profiles?.email;
                if (!email) return false;

                try {
                    await emailProvider.send({
                        to: email,
                        from: FROM,
                        subject,
                        html,
                    });
                    return true;
                } catch (err: any) {
                    console.error(`[MorningBrief] Failed to send to ${email}:`, err.message);
                    return false;
                }
            })
        );

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                emailsSent++;
            } else {
                errors++;
            }
        }

        console.log(`[MorningBrief] Done. Subscribers: ${subscribers.length}, Sent: ${emailsSent}, Errors: ${errors}`);

        return NextResponse.json({
            subscriberCount: subscribers.length,
            emailsSent,
            errors,
        });
    } catch (error: any) {
        console.error('[MorningBrief] Fatal error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
