/**
 * CDN cache headers for auth-free GET route handlers.
 *
 * Vercel's edge caches the response per-URL (including query string) for
 * `sMaxAge` seconds, then serves the stale copy for `swr` seconds while it
 * revalidates in the background. This keeps the common case off the serverless
 * function entirely   no invocation, no Supabase hit, no upstream API call  
 * which is the single biggest lever on free tiers.
 *
 * Only use on responses that are identical for every user. Never on routes that
 * read auth/cookies (those vary per user and must not be shared-cached).
 */
export function cdnCache(sMaxAge: number, swr: number = sMaxAge * 4): Record<string, string> {
    return {
        'Cache-Control': `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
    };
}
