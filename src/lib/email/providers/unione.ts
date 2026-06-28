/**
 * UniOne email provider adapter.
 * Docs: https://docs.unione.io/en/web-api-ref
 * Free/startUP tier: 500 emails/day.
 *
 * API key: set UNIONE_API_KEY in your env vars.
 * To switch providers: change EMAIL_PROVIDER env var and update the factory in ../index.ts.
 *
 * NOTE: UniOne uses separate `from_email`/`from_name` fields and `inline_attachments`
 * for CID-referenced images (e.g. newsletter header), as opposed to `attachments`.
 */

import type { EmailProvider, SendEmailOptions, SendEmailResult } from '../types';

const UNIONE_API_URL = 'https://api.unione.io/en/transactional/api/v1/email/send.json';

/** Parse "Display Name <addr@domain.com>" into { from_email, from_name }. */
function parseFrom(from: string): { from_email: string; from_name: string } {
    const match = from.match(/^(.+?)\s*<(.+?)>$/);
    if (match) {
        return { from_name: match[1].trim(), from_email: match[2].trim() };
    }
    return { from_name: from, from_email: from };
}

export class UniOneProvider implements EmailProvider {
    private apiKey: string;

    constructor(apiKey: string) {
        if (!apiKey) throw new Error('[UniOne] UNIONE_API_KEY is not set.');
        this.apiKey = apiKey;
    }

    async send(options: SendEmailOptions): Promise<SendEmailResult> {
        const { to, from, subject, html, attachments } = options;

        const { from_email, from_name } = parseFrom(from);

        const recipients = (Array.isArray(to) ? to : [to]).map((email) => ({ email }));

        // UniOne separates inline (CID) attachments from regular file attachments.
        const inlineAttachments: object[] = [];
        const regularAttachments: object[] = [];

        if (attachments && attachments.length > 0) {
            for (const att of attachments) {
                const base64 = att.content.toString('base64');
                if (att.contentId) {
                    // Inline CID attachment   referenced in HTML as <img src="cid:...">
                    inlineAttachments.push({
                        type: att.contentType ?? 'application/octet-stream',
                        name: att.contentId, // must match the cid: reference in HTML
                        content: base64,
                    });
                } else {
                    regularAttachments.push({
                        type: att.contentType ?? 'application/octet-stream',
                        name: att.filename,
                        content: base64,
                    });
                }
            }
        }

        const body: Record<string, unknown> = {
            message: {
                recipients,
                subject,
                from_email,
                from_name,
                body: { html },
                track_links: 1,
                track_read: 1,
                ...(regularAttachments.length > 0 ? { attachments: regularAttachments } : {}),
                ...(inlineAttachments.length > 0 ? { inline_attachments: inlineAttachments } : {}),
            },
        };

        const response = await fetch(UNIONE_API_URL, {
            method: 'POST',
            headers: {
                'X-API-KEY': this.apiKey,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`[UniOne] Send failed (${response.status}): ${errorText}`);
        }

        const data = await response.json().catch(() => ({}));
        // UniOne returns { status: 'success', job_id: '...' } on success
        return { id: data?.job_id };
    }
}
