/**
 * Envelope parsing + validation for connector requests.
 *
 * Mirrors the Python SDK's `_envelope.py`. Same versioned envelope shape:
 *
 *   {
 *     "op": "create_post" | "update_post" | "delete_post" | "ping",
 *     "version": "1",
 *     "request_id": "...",
 *     "timestamp": "iso8601",
 *     "post": { ...post fields... },       // optional (not for ping)
 *     "external_id": "..."                  // for update/delete
 *   }
 */
declare const SUPPORTED_VERSION = "1";
declare const VALID_OPS: readonly ["ping", "create_post", "update_post", "delete_post"];
type Op = typeof VALID_OPS[number];
declare class EnvelopeError extends Error {
    constructor(message: string);
}
interface Post {
    title: string;
    slug: string;
    body_html: string;
    excerpt: string;
    categories: string[];
    tags: string[];
    featured_image_url: string;
    author_name: string;
    seo_meta: Record<string, unknown>;
    json_ld: unknown[];
    status: string;
}
interface Envelope {
    op: Op;
    version: string;
    request_id: string;
    timestamp: string;
    post: Partial<Post>;
    external_id: string;
}
/** Parse and validate an envelope from a raw body string. */
declare function parseEnvelope(rawBody: string | Uint8Array): Envelope;
/** Fill defaults on a partial post so storage adapters don't need to null-check every field. */
declare function normalizePost(post: Partial<Post>): Post;

/**
 * StorageAdapter interface — every storage backend implements this.
 *
 * All methods return Promise<T> so both sync and async adapters plug in
 * cleanly. Adapters map envelope ops to whatever persistence the customer
 * wants: Supabase table, Postgres schema, Sanity dataset, etc.
 */

interface PostResult {
    external_id: string;
    external_url: string;
}
interface PingResult {
    site_name?: string;
    version?: string;
    supported_ops?: string[];
    post_count?: number;
    db_ok?: boolean;
    error?: string;
    [key: string]: unknown;
}
interface StorageAdapter {
    ping(): Promise<PingResult>;
    create_post(post: Post): Promise<PostResult>;
    update_post(externalId: string, post: Post): Promise<PostResult>;
    delete_post(externalId: string): Promise<void>;
}

export { type Envelope as E, type Op as O, type PingResult as P, type StorageAdapter as S, VALID_OPS as V, type Post as a, type PostResult as b, EnvelopeError as c, SUPPORTED_VERSION as d, normalizePost as n, parseEnvelope as p };
