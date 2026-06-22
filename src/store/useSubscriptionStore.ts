import { create } from 'zustand';
import { BETA_UNLOCK_ALL, BETA_PRO_FEATURES } from '@/lib/beta';

export type SubscriptionTier = 'free' | 'pro';

interface PlanFeatures {
    stock_lookups_per_day: number;
    max_alert_subs: number;
    signal_delay_min: number;
    screener_export: boolean;
    custom_rules: boolean;
    morning_brief: boolean;
    ipo_score: boolean;
}

interface UsageInfo {
    current: number;
    limit: number;
}

interface SubscriptionState {
    tier: SubscriptionTier;
    planId: string;
    status: string;
    features: PlanFeatures;
    periodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    usage: {
        stock_lookups: UsageInfo;
    };
    loading: boolean;
    lastFetched: number | null;

    fetch: () => Promise<void>;
    reset: () => void;
}

const DEFAULT_FEATURES: PlanFeatures = {
    stock_lookups_per_day: 5,
    max_alert_subs: 3,
    signal_delay_min: 30,
    screener_export: false,
    custom_rules: false,
    morning_brief: false,
    ipo_score: false,
};

// During the free beta, every visitor (even anonymous) is treated as Pro.
const BETA_STATE = {
    tier: 'pro' as SubscriptionTier,
    planId: 'beta',
    status: 'active',
    features: { ...BETA_PRO_FEATURES },
    periodEnd: null,
    cancelAtPeriodEnd: false,
    usage: { stock_lookups: { current: 0, limit: -1 } },
    loading: false,
    lastFetched: Date.now(),
};

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
    tier: BETA_UNLOCK_ALL ? 'pro' : 'free',
    planId: BETA_UNLOCK_ALL ? 'beta' : 'free',
    status: 'active',
    features: BETA_UNLOCK_ALL ? { ...BETA_PRO_FEATURES } : DEFAULT_FEATURES,
    periodEnd: null,
    cancelAtPeriodEnd: false,
    usage: {
        stock_lookups: { current: 0, limit: BETA_UNLOCK_ALL ? -1 : 5 },
    },
    loading: false,
    lastFetched: null,

    fetch: async () => {
        // Free beta: everyone is Pro, no need to hit the API.
        if (BETA_UNLOCK_ALL) {
            set(BETA_STATE);
            return;
        }
        const now = Date.now();
        const last = get().lastFetched;
        // Throttle: 1 request per 5 minutes
        if (last && now - last < 300_000) return;

        set({ loading: true });
        try {
            const res = await fetch('/api/billing/subscription');
            if (!res.ok) return;
            const data = await res.json();

            set({
                tier: data.tier || 'free',
                planId: data.planId || 'free',
                status: data.status || 'active',
                features: data.features || DEFAULT_FEATURES,
                periodEnd: data.periodEnd || null,
                cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
                usage: data.usage || { stock_lookups: { current: 0, limit: 5 } },
                lastFetched: now,
            });
        } catch {
            // Keep existing state on error
        } finally {
            set({ loading: false });
        }
    },

    reset: () => {
        set({
            tier: 'free',
            planId: 'free',
            status: 'active',
            features: DEFAULT_FEATURES,
            periodEnd: null,
            cancelAtPeriodEnd: false,
            usage: { stock_lookups: { current: 0, limit: 5 } },
            loading: false,
            lastFetched: null,
        });
    },
}));
