import { Receiver } from '@upstash/qstash';

// Authorizes requests to scheduled/cron endpoints. Accepts either:
//   1. A valid QStash request signature (how the live schedules call us), or
//   2. A matching x-cron-secret header (for manual triggering / debugging).
//
// QStash signs every request it sends with your account signing keys, so the
// endpoints don't need any shared secret in the schedule itself.
export async function verifyCronRequest(req: Request): Promise<boolean> {
    // Manual / legacy trigger
    const secret = req.headers.get('x-cron-secret');
    if (secret && process.env.CRON_SECRET && secret === process.env.CRON_SECRET) {
        return true;
    }

    // QStash signature
    const signature = req.headers.get('upstash-signature');
    const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;
    if (signature && currentKey && nextKey) {
        try {
            const receiver = new Receiver({ currentSigningKey: currentKey, nextSigningKey: nextKey });
            const body = await req.text();
            return await receiver.verify({ signature, body });
        } catch {
            return false;
        }
    }

    return false;
}
