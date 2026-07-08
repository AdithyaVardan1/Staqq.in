import { S as StorageAdapter, P as PingResult, a as Post, b as PostResult } from '../base-B2LUkGXA.cjs';

interface MemoryStorageOptions {
    site_name?: string;
    base_url?: string;
}
declare class MemoryStorage implements StorageAdapter {
    private posts;
    private readonly siteName;
    private readonly baseUrl;
    constructor(opts?: MemoryStorageOptions);
    ping(): Promise<PingResult>;
    create_post(post: Post): Promise<PostResult>;
    update_post(externalId: string, post: Post): Promise<PostResult>;
    delete_post(externalId: string): Promise<void>;
    private externalUrl;
    /** Test helper — returns stored post by id or undefined. */
    _get(externalId: string): Post | undefined;
    /** Test helper — snapshot of the store. */
    _all(): Record<string, Post>;
}

export { MemoryStorage, type MemoryStorageOptions };
