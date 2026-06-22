// ─── Beta launch switch ──────────────────────────────────────────────
// During the free public beta, every feature is unlocked for every visitor
// (logged-in or not) and no usage limits apply. The payment code stays intact
// and dormant in the repo.
//
// To turn paid gating back on (start charging), set the env var:
//     NEXT_PUBLIC_BETA_UNLOCK=false
// and redeploy. Anything other than the literal "false" keeps the beta open.
//
// NEXT_PUBLIC_ prefix so both server and client read the same value.
export const BETA_UNLOCK_ALL = process.env.NEXT_PUBLIC_BETA_UNLOCK !== 'false';

// Feature set granted to everyone while the beta is open.
export const BETA_PRO_FEATURES = {
    stock_lookups_per_day: -1,
    max_alert_subs: -1,
    signal_delay_min: 0,
    screener_export: true,
    custom_rules: true,
    morning_brief: true,
    ipo_score: true,
} as const;
