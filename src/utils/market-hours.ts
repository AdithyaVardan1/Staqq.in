// NSE trading session: Mon-Fri, 8:00 AM – 4:30 PM IST
// After 4:30 PM prices are frozen; no point calling Angel One.

const MARKET_OPEN_MINUTES  = 8 * 60;       // 8:00 AM IST
const MARKET_CLOSE_MINUTES = 16 * 60 + 30; // 4:30 PM IST

export function isMarketOpen(): boolean {
    const now = new Date();
    // Shift to IST (UTC+5:30)
    const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const day = ist.getUTCDay(); // 0 = Sun, 6 = Sat
    if (day === 0 || day === 6) return false;
    const t = ist.getUTCHours() * 60 + ist.getUTCMinutes();
    return t >= MARKET_OPEN_MINUTES && t < MARKET_CLOSE_MINUTES;
}

// How many seconds until the next market open (used for Redis TTL after close).
// Returns time until 8:00 AM next trading day, capped at 72h.
export function secondsUntilMarketOpen(): number {
    const now = new Date();
    const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const day = ist.getUTCDay();
    const t = ist.getUTCHours() * 60 + ist.getUTCMinutes();

    let daysAhead = 0;
    if (t >= MARKET_OPEN_MINUTES) daysAhead = 1; // already past open, target next day

    // Skip weekend
    const targetDay = (day + daysAhead) % 7;
    if (targetDay === 6) daysAhead += 2; // Sat → Mon
    else if (targetDay === 0) daysAhead += 1; // Sun → Mon

    const secondsUntilMidnight = (24 * 60 - t) * 60;
    const secondsForExtraDays = (daysAhead - 1) * 24 * 60 * 60;
    const secondsFromOpen = MARKET_OPEN_MINUTES * 60;

    return Math.min(secondsUntilMidnight + secondsForExtraDays + secondsFromOpen, 72 * 3600);
}
