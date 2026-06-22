import { NextRequest, NextResponse } from 'next/server';
import { scanForSpikes } from '@/lib/spikeDetector';
import { createAdminClient } from '@/utils/supabase/admin';
import { getEmailProvider } from '@/lib/email';
import { buildSpikeAlertEmail } from '@/lib/emailTemplates/spikeAlert';
import { verifyCronRequest } from '@/lib/cron-auth';

export const maxDuration = 30;

const FROM = process.env.EMAIL_FROM ?? 'Staqq Alerts <alerts@staqq.in>';
const IDEMPOTENCY_WINDOW_MIN = 15;

async function sendWithRetry(
    emailProvider: ReturnType<typeof getEmailProvider>,
    opts: { to: string; from: string; subject: string; html: string },
    retries = 1
): Promise<boolean> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            await emailProvider.send(opts);
            return true;
        } catch (err: any) {
            if (attempt === retries) {
                console.error(`[AlertScan] Email failed after ${retries + 1} attempts for ${opts.to}:`, err.message);
                return false;
            }
            // Brief pause before retry
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    return false;
}

export async function POST(req: NextRequest) {
    if (!(await verifyCronRequest(req))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const spikes = await scanForSpikes();

        if (spikes.length === 0) {
            return NextResponse.json({ spikes: 0, message: 'No spikes detected' });
        }

        const supabase = createAdminClient();
        const emailProvider = getEmailProvider();
        let notificationsCreated = 0;
        let emailsSent = 0;
        let duplicatesSkipped = 0;

        for (const spike of spikes) {
            // Idempotency: check if we already created an alert for this ticker
            // in the current window (prevents duplicate DB rows from concurrent/retried scans)
            const windowStart = new Date(Date.now() - IDEMPOTENCY_WINDOW_MIN * 60 * 1000).toISOString();
            const { data: existing } = await supabase
                .from('alerts')
                .select('id')
                .eq('ticker', spike.ticker)
                .gte('detected_at', windowStart)
                .limit(1);

            if (existing && existing.length > 0) {
                console.log(`[AlertScan] Skipping duplicate alert for ${spike.ticker} (already alerted in window)`);
                duplicatesSkipped++;
                continue;
            }

            const message = `${spike.ticker} mentioned ${spike.mentionCount}x in 15 min — ${spike.spikeMult}x above baseline`;

            // Insert alert record
            const { data: alertRow, error: alertErr } = await supabase
                .from('alerts')
                .insert({
                    ticker: spike.ticker,
                    mention_count: spike.mentionCount,
                    baseline_avg: spike.baselineAvg,
                    spike_mult: spike.spikeMult,
                    message,
                    top_post_url: spike.topPost?.url ?? null,
                    top_post_title: spike.topPost?.title ?? null,
                })
                .select('id')
                .single();

            if (alertErr || !alertRow) {
                console.error(`[AlertScan] Insert failed for ${spike.ticker}:`, alertErr?.message);
                continue;
            }

            // Find subscribers (ticker-specific OR 'ALL')
            const { data: subscribers } = await supabase
                .from('alert_subscriptions')
                .select('user_id, email')
                .eq('is_active', true)
                .or(`ticker.eq.${spike.ticker},ticker.eq.ALL`);

            if (!subscribers || subscribers.length === 0) continue;

            // Deduplicate by user_id
            const seen = new Set<string>();
            const uniqueSubs = subscribers.filter(s => {
                if (seen.has(s.user_id)) return false;
                seen.add(s.user_id);
                return true;
            });

            // Create in-app notifications
            const { error: notifErr } = await supabase
                .from('user_notifications')
                .insert(
                    uniqueSubs.map(s => ({
                        user_id: s.user_id,
                        alert_id: alertRow.id,
                        delivered_via: ['in_app'],
                    }))
                );

            if (notifErr) {
                console.error(`[AlertScan] Notification insert failed:`, notifErr.message);
            }
            notificationsCreated += uniqueSubs.length;

            // Send emails with retry
            const html = buildSpikeAlertEmail(spike);
            const emails = uniqueSubs.filter(s => s.email).map(s => s.email!);

            const results = await Promise.allSettled(
                emails.map(email =>
                    sendWithRetry(emailProvider, {
                        to: email,
                        from: FROM,
                        subject: `Staqq Alert: ${spike.ticker} is spiking on Reddit`,
                        html,
                    })
                )
            );

            emailsSent += results.filter(r => r.status === 'fulfilled' && r.value).length;
        }

        console.log(`[AlertScan] Done. Spikes: ${spikes.length}, Notifications: ${notificationsCreated}, Emails: ${emailsSent}, Duplicates skipped: ${duplicatesSkipped}`);
        return NextResponse.json({
            spikes: spikes.length,
            notificationsCreated,
            emailsSent,
            duplicatesSkipped,
            tickers: spikes.map(s => s.ticker),
        });
    } catch (error: any) {
        console.error('[AlertScan] Fatal error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
