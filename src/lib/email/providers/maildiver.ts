/**
 * MailDiver email provider adapter.
 * Docs: https://docs.maildiver.com/api-reference/introduction
 * Free tier: 5,000 emails/month, no daily limits.
 *
 * To switch to a different provider, create a new file in this directory
 * and update the EMAIL_PROVIDER env var   this file is the only thing that changes.
 */

import type { EmailProvider, SendEmailOptions, SendEmailResult } from '../types';

const MAILDIVER_API_URL = 'https://api.maildiver.com/v1/emails';

export class MailDiverProvider implements EmailProvider {
    private apiKey: string;

    constructor(apiKey: string) {
        if (!apiKey) throw new Error('[MailDiver] MAILDIVER_API_KEY is not set.');
        this.apiKey = apiKey;
    }

    async send(options: SendEmailOptions): Promise<SendEmailResult> {
        const { to, from, subject, html, attachments } = options;

        // Build the request body
        const body: Record<string, unknown> = {
            from,
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
        };

        // Attach files if present   MailDiver expects base64-encoded content
        if (attachments && attachments.length > 0) {
            body.attachments = attachments.map((att) => ({
                filename: att.filename,
                content: att.content.toString('base64'),
                type: att.contentType ?? 'application/octet-stream',
                ...(att.contentId ? { content_id: att.contentId, inline: true } : {}),
            }));
        }

        const response = await fetch(MAILDIVER_API_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`[MailDiver] Send failed (${response.status}): ${errorText}`);
        }

        const data = await response.json().catch(() => ({}));
        return { id: data?.id };
    }
}
