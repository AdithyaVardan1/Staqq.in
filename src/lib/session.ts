import { redis } from './redis';

const SESSION_TTL = 30 * 60; // 30 minutes inactivity timeout
const ACTIVE_USERS_KEY = 'global:active_users';

export class SessionManager {
    /**
     * Updates the "last active" timestamp for a user.
     * Uses a Sorted Set (ZSET) where score = timestamp.
     */
    async trackUserActivity(userId: string) {
        const now = Date.now();
        // Add/Update user in sorted set with current timestamp utilizing safe wrapper
        await redis.zadd(ACTIVE_USERS_KEY, now, userId);
    }

    /**
     * Returns the count of unique users active in the last N minutes.
     */
    async getActiveUserCount(minutes: number = 15): Promise<number> {
        const cutoff = Date.now() - (minutes * 60 * 1000);
        return redis.zcount(ACTIVE_USERS_KEY, cutoff, '+inf');
    }

    /**
     * Cleans up users inactive for more than 1 hour (maintenance)
     */
    async cleanupInactiveUsers() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        await redis.zremrangebyscore(ACTIVE_USERS_KEY, '-inf', oneHourAgo);
    }

    /**
     * Stores ephemeral data for a user session (e.g. "viewed_stocks")
     * Uses Redis HASH for memory efficiency: session:{userId} -> { key: value }
     */
    async setSessionData(userId: string, key: string, value: any) {
        const sessionKey = `session:${userId}`;
        // Use safe wrapper that handles pipeline and errors
        await redis.hSetWithExpiry(sessionKey, key, JSON.stringify(value), SESSION_TTL);
    }

    async getSessionData<T>(userId: string, key: string): Promise<T | null> {
        const sessionKey = `session:${userId}`;
        const data = await redis.hget(sessionKey, key);
        return data ? JSON.parse(data) : null;
    }

    /**
     * Delete a specific session data field
     */
    async deleteSessionData(userId: string, key: string) {
        return redis.hdel(`session:${userId}`, key);
    }
}

export const sessionManager = new SessionManager();
