#!/usr/bin/env node
/**
 * Creates (or refreshes) the Upstash QStash schedules that drive Staqq's
 * background jobs. Run once after setting up QStash, and again whenever the
 * schedule list below changes.
 *
 * Usage:
 *   QSTASH_TOKEN=xxxx node scripts/setup-qstash.mjs
 *   QSTASH_TOKEN=xxxx SITE_URL=https://www.staqq.in node scripts/setup-qstash.mjs
 *
 * QStash signs every request with your account signing keys, so the target
 * endpoints authenticate via verifyCronRequest() — no shared secret is sent.
 * Cron expressions are evaluated in UTC.
 */

const TOKEN = process.env.QSTASH_TOKEN;
const SITE_URL = (process.env.SITE_URL || 'https://www.staqq.in').replace(/\/$/, '');
const QSTASH = 'https://qstash.upstash.io/v2/schedules';

if (!TOKEN) {
    console.error('✗ QSTASH_TOKEN env var is required. Get it from the Upstash QStash dashboard.');
    process.exit(1);
}

// destination path -> cron (UTC)
const SCHEDULES = [
    { path: '/api/alerts/scan',   cron: '*/15 * * * *' }, // every 15 min — the alert promise
    { path: '/api/morning-brief', cron: '0 2 * * 1-6'  }, // Mon–Sat 02:00 UTC
    { path: '/api/blog/generate', cron: '0 4 * * *'    }, // daily 04:00 UTC
];

const auth = { Authorization: `Bearer ${TOKEN}` };

async function listSchedules() {
    const res = await fetch(QSTASH, { headers: auth });
    if (!res.ok) throw new Error(`list failed: ${res.status} ${await res.text()}`);
    return res.json();
}

async function deleteSchedule(id) {
    const res = await fetch(`${QSTASH}/${id}`, { method: 'DELETE', headers: auth });
    if (!res.ok && res.status !== 404) throw new Error(`delete ${id} failed: ${res.status}`);
}

async function createSchedule(destination, cron) {
    const res = await fetch(`${QSTASH}/${destination}`, {
        method: 'POST',
        headers: { ...auth, 'Upstash-Cron': cron },
    });
    if (!res.ok) throw new Error(`create ${destination} failed: ${res.status} ${await res.text()}`);
    return res.json();
}

async function main() {
    const wanted = SCHEDULES.map((s) => `${SITE_URL}${s.path}`);

    // Remove any existing schedules pointing at our destinations (idempotent re-runs)
    const existing = await listSchedules();
    for (const sch of existing) {
        if (wanted.includes(sch.destination)) {
            await deleteSchedule(sch.scheduleId);
            console.log(`· removed old schedule ${sch.scheduleId} → ${sch.destination}`);
        }
    }

    for (const s of SCHEDULES) {
        const destination = `${SITE_URL}${s.path}`;
        const { scheduleId } = await createSchedule(destination, s.cron);
        console.log(`✓ ${s.cron.padEnd(14)} → ${destination}  (${scheduleId})`);
    }

    console.log('\nDone. View/manage these in the Upstash QStash dashboard → Schedules.');
}

main().catch((err) => {
    console.error('✗', err.message);
    process.exit(1);
});
