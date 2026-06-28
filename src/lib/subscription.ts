import { redis } from './redis';
import { createAdminClient } from '@/utils/supabase/admin';
import { BETA_UNLOCK_ALL, BETA_PRO_FEATURES } from './beta';

// ─── Types ───────────────────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'pro';

export interface PlanFeatures {
    stock_lookups_per_day: number; // -1 = unlimited
    max_alert_subs: number;       // -1 = unlimited
    signal_delay_min: number;     // 0 = real-time
    screener_export: boolean;
    custom_rules: boolean;
    morning_brief: boolean;
    ipo_score: boolean;
}

export interface SubscriptionInfo {
    tier: SubscriptionTier;
    planId: string;
    status: string;
    features: PlanFeatures;
    periodEnd: string | null;
    cancelAtPeriodEnd: boolean;
}

const DEFAULT_FREE_FEATURES: PlanFeatures = {
    stock_lookups_per_day: 5,
    max_alert_subs: 3,
    signal_delay_min: 30,
    screener_export: false,
    custom_rules: false,
    morning_brief: false,
    ipo_score: false,
};

const CACHE_TTL = 300; // 5 minutes
const CACHE_PREFIX = 'sub:';
const USAGE_PREFIX = 'usage:';

// ─── Core Functions ──────────────────────────────────────────────────

/** Get full subscription info for a user (cached in Redis for 5 min) */
export async function getSubscription(userId: string): Promise<SubscriptionInfo> {
    // Free beta: everyone gets the full feature set, no DB lookup needed.
    if (BETA_UNLOCK_ALL) {
        return {
            tier: 'pro',
            planId: 'beta',
            status: 'active',
            features: { ...BETA_PRO_FEATURES },
            periodEnd: null,
            cancelAtPeriodEnd: false,
        };
    }

    // Try Redis cache first
    const cached = await redis.get(`${CACHE_PREFIX}${userId}`);
    if (cached) {
        try {
            return JSON.parse(cached);
        } catch {
            // Corrupted cache, fetch fresh
        }
    }

    // Fetch from Supabase
    let data = null;
    let error = null;
    try {
        const admin = createAdminClient();
        const response = await admin
            .from('subscriptions')
            .select(`
                plan_id,
                status,
                current_period_end,
                cancel_at_period_end,
                plans:plan_id (features)
            `)
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();
        data = response.data;
        error = response.error;
    } catch (e: any) {
        // Fallback gracefully if Supabase Admin is unconfigured
        console.warn('[Subscription] Fallback to Free Tier:', e.message);
        error = true;
    }

    if (error || !data) {
        // No subscription found   return free tier
        const freeInfo: SubscriptionInfo = {
            tier: 'free',
            planId: 'free',
            status: 'active',
            features: DEFAULT_FREE_FEATURES,
            periodEnd: null,
            cancelAtPeriodEnd: false,
        };
        await redis.set(`${CACHE_PREFIX}${userId}`, JSON.stringify(freeInfo), CACHE_TTL);
        return freeInfo;
    }

    const planFeatures = (data.plans as any)?.features ?? DEFAULT_FREE_FEATURES;
    const tier: SubscriptionTier = data.plan_id === 'free' ? 'free' : 'pro';

    const info: SubscriptionInfo = {
        tier,
        planId: data.plan_id,
        status: data.status,
        features: planFeatures as PlanFeatures,
        periodEnd: data.current_period_end,
        cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
    };

    // Cache in Redis
    await redis.set(`${CACHE_PREFIX}${userId}`, JSON.stringify(info), CACHE_TTL);

    return info;
}

/** Lightweight tier check   returns just 'free' or 'pro' */
export async function getSubscriptionTier(userId: string): Promise<SubscriptionTier> {
    const sub = await getSubscription(userId);
    return sub.tier;
}

/** Invalidate cached subscription (call after payment events) */
export async function invalidateSubscriptionCache(userId: string): Promise<void> {
    await redis.del(`${CACHE_PREFIX}${userId}`);
}

// ─── Usage Tracking ──────────────────────────────────────────────────

/**
 * Check if a free-tier user can use a feature, and increment the counter.
 * Returns { allowed, current, limit }.
 * For pro users, always returns allowed: true.
 */
export async function checkAndIncrementUsage(
    userId: string,
    feature: 'stock_lookups'
): Promise<{ allowed: boolean; current: number; limit: number }> {
    const sub = await getSubscription(userId);

    // Pro users have unlimited access
    const limit = feature === 'stock_lookups'
        ? sub.features.stock_lookups_per_day
        : -1;

    if (limit === -1) {
        return { allowed: true, current: 0, limit: -1 };
    }

    // Use Redis counter with daily TTL
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key = `${USAGE_PREFIX}${feature}:${userId}:${today}`;

    // Get current count without incrementing first
    const currentStr = await redis.get(key);
    const current = currentStr ? parseInt(currentStr, 10) : 0;

    if (current >= limit) {
        return { allowed: false, current, limit };
    }

    // Increment with daily TTL (expires at midnight-ish, 86400s = 24h)
    const newCount = await redis.incr(key, 86400);

    // Double-check after increment (race condition guard)
    if (newCount > limit) {
        return { allowed: false, current: newCount, limit };
    }

    return { allowed: true, current: newCount, limit };
}

/**
 * Get current usage without incrementing.
 */
export async function getUsage(
    userId: string,
    feature: 'stock_lookups'
): Promise<{ current: number; limit: number }> {
    const sub = await getSubscription(userId);
    const limit = feature === 'stock_lookups'
        ? sub.features.stock_lookups_per_day
        : -1;

    if (limit === -1) {
        return { current: 0, limit: -1 };
    }

    const today = new Date().toISOString().slice(0, 10);
    const key = `${USAGE_PREFIX}${feature}:${userId}:${today}`;
    const currentStr = await redis.get(key);
    const current = currentStr ? parseInt(currentStr, 10) : 0;

    return { current, limit };
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Check if user can add more alert subscriptions */
export async function canAddAlertSubscription(userId: string, currentCount: number): Promise<boolean> {
    const sub = await getSubscription(userId);
    if (sub.features.max_alert_subs === -1) return true;
    return currentCount < sub.features.max_alert_subs;
}

/** Check if a specific premium feature is available */
export async function hasFeature(
    userId: string,
    feature: keyof PlanFeatures
): Promise<boolean> {
    const sub = await getSubscription(userId);
    const value = sub.features[feature];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === -1 || value > 0;
    return false;
}
