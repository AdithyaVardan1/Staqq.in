import { create } from 'zustand';

interface AlertData {
    id: string;
    ticker: string;
    mention_count: number;
    spike_mult: number;
    baseline_avg: number;
    message: string;
    top_post_url: string | null;
    top_post_title: string | null;
    detected_at: string;
}

interface Notification {
    id: string;
    read: boolean;
    created_at: string;
    delivered_via: string[];
    alert: AlertData;
}

interface NotificationsState {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    lastFetched: number | null;
    _pendingReadIds: Set<string>; // track optimistic marks in-flight

    fetch: () => Promise<void>;
    markRead: (ids: string[]) => Promise<void>;
    markAllRead: () => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    lastFetched: null,
    _pendingReadIds: new Set(),

    fetch: async () => {
        const now = Date.now();
        const last = get().lastFetched;
        if (last && now - last < 60_000) return; // throttle: 1 req/min

        set({ loading: true });
        try {
            const res = await fetch('/api/alerts/notifications');
            if (!res.ok) return;
            const data = await res.json();
            const incoming: Notification[] = data.notifications ?? [];

            // Merge: preserve optimistic read=true for IDs still pending confirmation
            const pending = get()._pendingReadIds;
            const merged = pending.size > 0
                ? incoming.map(n => pending.has(n.id) ? { ...n, read: true } : n)
                : incoming;

            set({
                notifications: merged,
                unreadCount: merged.filter(n => !n.read).length,
                lastFetched: now,
            });
        } catch {
            // Network error   keep existing state
        } finally {
            set({ loading: false });
        }
    },

    markRead: async (ids: string[]) => {
        const prev = get().notifications;
        const prevUnread = get().unreadCount;

        // Track pending optimistic IDs
        set(state => {
            const newPending = new Set(state._pendingReadIds);
            ids.forEach(id => newPending.add(id));
            return {
                notifications: state.notifications.map(n =>
                    ids.includes(n.id) ? { ...n, read: true } : n
                ),
                unreadCount: Math.max(0, state.unreadCount - ids.filter(id =>
                    state.notifications.find(n => n.id === id && !n.read)
                ).length),
                _pendingReadIds: newPending,
            };
        });

        try {
            const res = await fetch('/api/alerts/notifications/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationIds: ids }),
            });
            if (!res.ok) throw new Error('Failed');
        } catch {
            // Rollback optimistic update on failure
            set({ notifications: prev, unreadCount: prevUnread });
        } finally {
            // Clear pending IDs
            set(state => {
                const newPending = new Set(state._pendingReadIds);
                ids.forEach(id => newPending.delete(id));
                return { _pendingReadIds: newPending };
            });
        }
    },

    markAllRead: async () => {
        const prev = get().notifications;
        const prevUnread = get().unreadCount;
        const allIds = prev.filter(n => !n.read).map(n => n.id);

        set(state => {
            const newPending = new Set(state._pendingReadIds);
            allIds.forEach(id => newPending.add(id));
            return {
                notifications: state.notifications.map(n => ({ ...n, read: true })),
                unreadCount: 0,
                _pendingReadIds: newPending,
            };
        });

        try {
            const res = await fetch('/api/alerts/notifications/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ all: true }),
            });
            if (!res.ok) throw new Error('Failed');
        } catch {
            // Rollback on failure
            set({ notifications: prev, unreadCount: prevUnread });
        } finally {
            set(state => {
                const newPending = new Set(state._pendingReadIds);
                allIds.forEach(id => newPending.delete(id));
                return { _pendingReadIds: newPending };
            });
        }
    },
}));
