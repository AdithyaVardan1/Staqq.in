import { D as DispatchOptions } from '../dispatch-CHptvh1l.cjs';
import { S as StorageAdapter } from '../base-B2LUkGXA.cjs';

/**
 * Express integration — `mount(app, opts)` registers a POST route.
 *
 *   import express from 'express'
 *   import { mount } from 'panini-connector/express'
 *   import { SupabaseStorage } from 'panini-connector/storage/supabase'
 *
 *   const app = express()
 *   mount(app, { path: '/api/seo-connector', storage: new SupabaseStorage() })
 *
 * IMPORTANT: If you have express.json() applied globally, the raw body
 * is not available for signature verification. Either apply express.json()
 * AFTER `mount()`, or exclude the connector path from the global parser.
 * `mount()` installs its own raw-body middleware scoped to the route.
 */

interface ExpressAppLike {
    post(path: string, ...handlers: ExpressHandler[]): unknown;
}
type ExpressHandler = (req: ExpressReq, res: ExpressRes, next: (e?: unknown) => void) => void | Promise<void>;
interface ExpressReq {
    headers: Record<string, string | string[] | undefined>;
    body?: unknown;
    rawBody?: Buffer | string;
    on?: (event: string, cb: (chunk: Buffer) => void) => void;
    setEncoding?: (enc: string) => void;
}
interface ExpressRes {
    status(code: number): ExpressRes;
    setHeader(name: string, value: string): void;
    json(body: unknown): void;
    send(body: unknown): void;
}
interface MountOptions extends DispatchOptions {
    path?: string;
    storage: StorageAdapter;
    secret?: string;
    secretEnv?: string;
    replayWindowSeconds?: number;
}
declare function mount(app: ExpressAppLike, opts: MountOptions): void;

export { type ExpressAppLike, type MountOptions, mount };
