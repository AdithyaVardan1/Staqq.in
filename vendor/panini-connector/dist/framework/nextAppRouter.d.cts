import { D as DispatchOptions } from '../dispatch-CHptvh1l.cjs';
import { S as StorageAdapter } from '../base-B2LUkGXA.cjs';

/**
 * Next.js App Router — createHandler() returns a POST route handler that
 * plugs straight into `app/api/seo-connector/route.ts`:
 *
 *   // app/api/seo-connector/route.ts
 *   import { createHandler } from 'panini-connector/next-app'
 *   import { MemoryStorage } from 'panini-connector/storage/memory'
 *
 *   const handler = createHandler({ storage: new MemoryStorage() })
 *   export const POST = handler
 *
 * (Or use `resolveStorage("supabase")` etc. — see index.ts.)
 */

interface HandlerOptions extends DispatchOptions {
    storage: StorageAdapter;
    secret?: string;
    secretEnv?: string;
    replayWindowSeconds?: number;
}
/**
 * Create a POST handler for Next.js App Router.
 * Returns a function suitable to export as `POST` from a route.ts file.
 */
declare function createHandler(opts: HandlerOptions): (req: Request) => Promise<Response>;

export { type HandlerOptions, createHandler };
