import { S as StorageAdapter } from './base-B2LUkGXA.js';
export { E as Envelope, c as EnvelopeError, O as Op, P as PingResult, a as Post, b as PostResult, d as SUPPORTED_VERSION, V as VALID_OPS, n as normalizePost, p as parseEnvelope } from './base-B2LUkGXA.js';
export { D as DispatchOptions, a as DispatchResult, P as PostCallback, d as dispatch, i as isNotFound } from './dispatch-5u1paW72.js';
export { MemoryStorage } from './storage/memory.js';

declare const REPLAY_WINDOW_SECONDS = 300;
declare class VerificationError extends Error {
    constructor(message: string);
}
/** Compute the signature for the given inputs. Deterministic. */
declare function computeSignature(secret: string, timestamp: string, rawBody: string | Uint8Array): string;
interface VerifyArgs {
    secret: string;
    timestamp: string | null | undefined;
    signature: string | null | undefined;
    rawBody: string | Uint8Array;
    replayWindowSeconds?: number;
    /** Injectable clock for tests (seconds since epoch). */
    _now?: number;
}
/**
 * Verify an incoming request signature. Throws `VerificationError` on any
 * failure; returns void on success.
 */
declare function verify(args: VerifyArgs): void;

/**
 * panini-connector — Node.js SDK
 *
 * Public re-exports. Users typically import framework/storage modules
 * from their subpath (`panini-connector/next-app`, `panini-connector/storage/supabase`)
 * for tree-shaking + optional-peer-dep cleanliness.
 */

declare const VERSION = "0.1.0";

type StorageAlias = 'memory' | 'supabase' | 'postgres';
declare function resolveStorage(storage: StorageAlias | StorageAdapter, config?: Record<string, unknown>): Promise<StorageAdapter>;

export { REPLAY_WINDOW_SECONDS, StorageAdapter, type StorageAlias, VERSION, VerificationError, type VerifyArgs, computeSignature, resolveStorage, verify };
