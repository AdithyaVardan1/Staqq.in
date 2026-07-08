import { S as StorageAdapter, a as Post, P as PingResult, b as PostResult } from '../base-B2LUkGXA.cjs';

interface SupabaseStorageOptions {
    url?: string;
    service_role_key?: string;
    url_env?: string;
    key_env?: string;
    /** Target table. Default: 'panini_posts' (SDK's own schema). */
    table?: string;
    site_name?: string;
    /** Legacy: prepended to slug to make external_url. Superseded by
     *  externalUrlTemplate when set. */
    base_url?: string;
    /**
     * Transform a normalized Panini `Post` into the row you want to insert.
     * Return your table's exact column names + values. Static columns
     * (`category: 'seo'`, etc.) go here as literals. Fields you skip stay
     * unset (Postgres uses their column defaults).
     *
     * If unset, SDK uses its default 1:1 mapping to Post fields (the
     * greenfield `panini_posts` shape).
     */
    toRow?: (post: Post) => Record<string, unknown>;
    /**
     * Which column holds the ID we should return to Panini as `external_id`
     * (and use as the lookup key for update/delete).
     *
     *   'external_id' (default) — SDK generates a `sb_<hex>` string on insert
     *   and stores it in this column. Your table must have this column.
     *
     *   Anything else (e.g. 'id') — DB generates the ID on insert (via
     *   default like `gen_random_uuid()` or serial). SDK reads it back
     *   from the RETURNING clause and uses it. No `external_id` column
     *   required on your side.
     */
    externalIdColumn?: string;
    /**
     * URL where posts render on your site — Panini uses this as
     * `external_url` in its response. Substitutions:
     *   {slug}  → post.slug
     *   {id}    → the external_id returned to Panini
     *   {title} → post.title (URL-encoded)
     * If unset, falls back to base_url + '/' + slug for backwards compat.
     */
    externalUrlTemplate?: string;
}
declare class SupabaseStorage implements StorageAdapter {
    private readonly url;
    private readonly key;
    private readonly table;
    private readonly siteName;
    private readonly baseUrl;
    private readonly toRow;
    private readonly externalIdColumn;
    private readonly sdkGeneratesId;
    private readonly externalUrlTemplate;
    constructor(opts?: SupabaseStorageOptions);
    private get headers();
    ping(): Promise<PingResult>;
    create_post(post: Post): Promise<PostResult>;
    update_post(externalId: string, post: Post): Promise<PostResult>;
    delete_post(externalId: string): Promise<void>;
    /** Substitute {slug}/{id}/{title} in externalUrlTemplate. Falls back
     *  to legacy base_url + slug for backwards compat. */
    private buildUrl;
}

export { SupabaseStorage, type SupabaseStorageOptions };
