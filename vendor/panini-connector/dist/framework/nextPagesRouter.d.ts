import { D as DispatchOptions } from '../dispatch-5u1paW72.js';
import { S as StorageAdapter } from '../base-B2LUkGXA.js';

/**
 * Next.js Pages Router — createHandler() returns a handler function
 * usable from `pages/api/seo-connector.ts`:
 *
 *   // pages/api/seo-connector.ts
 *   import { createHandler } from 'panini-connector/next-pages'
 *   import { SupabaseStorage } from 'panini-connector/storage/supabase'
 *
 *   export const config = { api: { bodyParser: false } }  // IMPORTANT
 *   export default createHandler({ storage: new SupabaseStorage() })
 *
 * NOTE: You MUST disable Next's default body parser (config above) so
 * we can read the raw body for HMAC verification.
 */

interface NextApiRequestLike {
    method?: string;
    headers: Record<string, string | string[] | undefined>;
    on(event: 'data', cb: (chunk: Buffer) => void): void;
    on(event: 'end', cb: () => void): void;
    on(event: 'error', cb: (e: Error) => void): void;
}
interface NextApiResponseLike {
    status(code: number): NextApiResponseLike;
    setHeader(name: string, value: string): void;
    send(body: string): void;
    end(body?: string): void;
}
interface HandlerOptions extends DispatchOptions {
    storage: StorageAdapter;
    secret?: string;
    secretEnv?: string;
    replayWindowSeconds?: number;
}
declare function createHandler(opts: HandlerOptions): (req: NextApiRequestLike, res: NextApiResponseLike) => Promise<void>;

export { type HandlerOptions, type NextApiRequestLike, type NextApiResponseLike, createHandler };
