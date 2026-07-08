import { S as StorageAdapter, a as Post, P as PingResult, b as PostResult } from '../base-B2LUkGXA.js';

interface PostgresStorageOptions {
    dsn?: string;
    dsn_env?: string;
    table?: string;
    site_name?: string;
    /** Legacy base URL; superseded by externalUrlTemplate when set. */
    base_url?: string;
    auto_create_table?: boolean;
    /** Transform a Panini Post into your DB row. See SupabaseStorage docs. */
    toRow?: (post: Post) => Record<string, unknown>;
    /** DB column that stores our external_id. Default 'external_id'. */
    externalIdColumn?: string;
    /** URL template. {slug}, {id}, {title} substituted. */
    externalUrlTemplate?: string;
}
declare class PostgresStorage implements StorageAdapter {
    private dsn;
    private table;
    private siteName;
    private baseUrl;
    private tableReady;
    private poolPromise;
    private readonly toRow;
    private readonly externalIdColumn;
    private readonly sdkGeneratesId;
    private readonly externalUrlTemplate;
    private readonly customMode;
    constructor(opts?: PostgresStorageOptions);
    private getPool;
    private ensureTable;
    ping(): Promise<PingResult>;
    create_post(post: Post): Promise<PostResult>;
    update_post(externalId: string, post: Post): Promise<PostResult>;
    delete_post(externalId: string): Promise<void>;
    private buildUrl;
}

export { PostgresStorage, type PostgresStorageOptions };
