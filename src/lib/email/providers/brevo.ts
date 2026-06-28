/**
 * Brevo (ex-Sendinblue) email provider adapter.
 * Docs: https://developers.brevo.com/reference/sendtransacemail
 * Free tier: 300 emails/day, 9,000/month, no recipient restrictions.
 *
 * API key: set BREVO_API_KEY in your env vars.
 * To switch providers: change EMAIL_PROVIDER env var and update the factory in ../index.ts.
 *
 * NOTE: Brevo's API does not support CID inline attachments.
 * The newsletter template handles this by embedding the header image as a base64 data URI
 * (via the optional `headerImageBase64` param in buildRobustNewsletter) and using the
 * public URL for the logo   so this adapter sends no attachments at all.
 */

import type { EmailProvider, SendEmailOptions, SendEmailResult } from '../types';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/** Parse "Display Name <addr@domain.com>" into { name, email }. */
function parseFrom(from: string): { name: string; email: string } {
    const match = from.match(/^(.+?)\s*<(.+?)>$/);
    if (match) return { name: match[1].trim(), email: match[2].trim() };
    return { name: from, email: from };
}

export class BrevoProvider implements EmailProvider {
    private apiKey: string;

    constructor(apiKey: string) {
        if (!apiKey) throw new Error('[Brevo] BREVO_API_KEY is not set.');
        this.apiKey = apiKey;
    }

    async send(options: SendEmailOptions): Promise<SendEmailResult> {
        const { to, from, subject, html, attachments } = options;

        const sender = parseFrom(from);
        const toList = (Array.isArray(to) ? to : [to]).map((email) => ({ email }));

        // Build regular (non-inline) attachments only   Brevo doesn't support CID inline.
        // The template already embeds the header as a data URI, so CID attachments are skipped.
        const regularAttachments = (attachments ?? [])
            .filter((att) => !att.contentId)
            .map((att) => ({
                name: att.filename,
                content: att.content.toString('base64'),
            }));

        const body: Record<string, unknown> = {
            sender,
            to: toList,
            subject,
            htmlContent: html,
            ...(regularAttachments.length > 0 ? { attachment: regularAttachments } : {}),
        };

        const response = await fetch(BREVO_API_URL, {
            method: 'POST',
            headers: {
                'api-key': this.apiKey,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`[Brevo] Send failed (${response.status}): ${errorText}`);
        }

        const data = await response.json().catch(() => ({}));
        return { id: data?.messageId };
    }
}
