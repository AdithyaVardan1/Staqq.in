import { E as Envelope, S as StorageAdapter } from './base-B2LUkGXA.js';

/**
 * Framework-agnostic dispatcher: turn a verified+parsed envelope into a
 * storage-adapter call. Returns the response payload the framework
 * serializes.
 */

type PostCallback = (op: string, payload: Record<string, unknown>) => void | Promise<void>;
interface DispatchResult extends Record<string, unknown> {
    ok: boolean;
    external_id?: string;
    external_url?: string;
    error?: string;
}
interface DispatchOptions {
    onPostChange?: PostCallback;
}
declare const isNotFound: (e: unknown) => boolean;
declare function dispatch(envelope: Envelope, storage: StorageAdapter, opts?: DispatchOptions): Promise<DispatchResult>;

export { type DispatchOptions as D, type PostCallback as P, type DispatchResult as a, dispatch as d, isNotFound as i };
