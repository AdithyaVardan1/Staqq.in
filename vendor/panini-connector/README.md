# panini-connector (Node.js)

Drop-in HMAC-verified connector for receiving Panini SEO publish calls on
self-hosted Next.js / Express sites. Turns 80 lines of copy-paste boilerplate
into 5 lines.

Companion to [`panini-connector` Python](https://github.com/prak16/PaniniOS/tree/main/sdk/panini-connector-py) — same envelope, same signing scheme, same test CLI.

## Install (MVP — via monorepo)

Two options — **clone + local install** works with any package manager (recommended):

```bash
git clone --depth 1 --branch feat/compass \
  https://github.com/prak16/PaniniOS.git ~/panini-monorepo

# Then in your project:
npm install ~/panini-monorepo/sdk/panini-connector-js
```

**Or**, if you use pnpm, it supports subdirectory git installs natively:

```bash
pnpm add "github:prak16/PaniniOS#feat/compass&subdirectory=sdk/panini-connector-js"
```

> ❌ **Plain `npm install "…git+…#branch:subdir"` does NOT work** — npm silently
> ignores the subdirectory fragment and tries to install from the repo root
> (which has no `package.json`). Only pnpm and Yarn 3+ support subdirectory git URLs.

(Once the SDK is stable, it'll be published to npm as `panini-connector`.)

## Use — Existing blog table (recommended for real sites)

**If your site already has a `blog_posts` / `posts` / `articles` table your site renders from**, don't create a new one — point the SDK at your existing table:

```typescript
// app/api/seo-connector/route.ts
import { createHandler } from 'panini-connector/next-app'
import { SupabaseStorage } from 'panini-connector/storage/supabase'

const handler = createHandler({
  storage: new SupabaseStorage({
    table: 'blog_posts',                          // your real table
    externalIdColumn: 'id',                       // your PK (DB-generated UUID)
    externalUrlTemplate: 'https://mysite.com/blog/{slug}',

    // Transform Panini post → your row. Rename columns, add extras.
    toRow: (post) => ({
      title: post.title,
      slug: post.slug,
      content: post.body_html,                    // renamed
      description: post.excerpt || post.seo_meta?.description || '',
      meta_title: post.seo_meta?.title || post.title,
      meta_description: post.seo_meta?.description || post.excerpt,
      featured_image_url: post.featured_image_url,
      author_name: post.author_name,
      status: post.status || 'published',
      // Extra columns your schema requires
      category: 'seo',
      external_source: 'panini',
      published_at: new Date().toISOString(),
    }),
  }),
})

export const POST = handler
```

**How the two knobs work:**

- **`externalIdColumn`** — which column stores the ID you'll get back as `external_id`.
  - Set to `'id'` (or any name) when your table has a DB-generated primary key. SDK inserts without an ID and reads it back from `RETURNING id`.
  - Leave unset (defaults to `'external_id'`) to have the SDK generate an ID (`sb_a3f9…`) and insert it. Requires that column on your table.

- **`externalUrlTemplate`** — where posts render on your site. Substitutions: `{slug}`, `{id}`, `{title}`.

**RLS note:** if your existing table has RLS on, make sure the service role can `INSERT`, `UPDATE`, `DELETE`. Service role bypasses RLS by default, but a badly configured policy can still block writes.

## Use — Next.js App Router + Supabase

```typescript
// app/api/seo-connector/route.ts
import { createHandler } from 'panini-connector/next-app'
import { SupabaseStorage } from 'panini-connector/storage/supabase'

const handler = createHandler({
  storage: new SupabaseStorage(),
})
export const POST = handler
```

Set these env vars, then redeploy:

```
SEO_CONNECTOR_SECRET=<any long random string; must match Panini's config>
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key from Supabase → Settings → API>
```

Run the schema SQL once in Supabase SQL Editor (see [Envelope format](#envelope-format) for what fields to store).

**That's it.** Panini will POST to `/api/seo-connector` when it publishes.

## Use — Next.js Pages Router + Postgres

```typescript
// pages/api/seo-connector.ts
import { createHandler } from 'panini-connector/next-pages'
import { PostgresStorage } from 'panini-connector/storage/postgres'

// IMPORTANT: disable Next's default body parser so we can read raw bytes
export const config = { api: { bodyParser: false } }

export default createHandler({
  storage: new PostgresStorage(),
})
```

Set `SEO_CONNECTOR_SECRET` + `DATABASE_URL`. The SDK creates a `panini_posts` table on first call (idempotent).

## Use — Express + Supabase

```typescript
import express from 'express'
import { mount } from 'panini-connector/express'
import { SupabaseStorage } from 'panini-connector/storage/supabase'

const app = express()
mount(app, {
  path: '/api/seo-connector',
  storage: new SupabaseStorage(),
})

app.listen(3000)
```

**Note:** if you use `express.json()` globally, apply it AFTER `mount()`, or exclude the connector path from it. The SDK reads raw bytes for signature verification.

## Verify it works — the CLI

Ship it, then from anywhere:

```bash
npx panini-connector test \
    --url https://your-vm.example.com/api/seo-connector \
    --secret $SEO_CONNECTOR_SECRET
```

Output on success:

```
Testing connector at https://your-vm.example.com/api/seo-connector...
  ✓ ping        → 200 OK  site_name="My Blog"
  ✓ create_post → 200 OK  external_id="sb_a3f9b2c1"
  ✓ update_post → 200 OK
  ✓ delete_post → 200 OK

All ops working. Your connector is wired correctly.
```

## What the SDK does under the hood

- Verifies `X-Compass-Signature` (HMAC-SHA256 over `${timestamp}.${body}`)
- Rejects requests with timestamps outside a 5-min replay window
- Parses the versioned envelope
- Dispatches to your storage adapter (`create_post` / `update_post` / `delete_post` / `ping`)
- Returns `{ok, external_id, external_url}` per Panini's expected shape

Errors are surfaced with meaningful HTTP status codes:
- **401** — signature mismatch, missing headers, replay window expired
- **400** — malformed envelope, unsupported version
- **404** — `update_post` / `delete_post` with unknown `external_id`
- **500** — storage adapter raised an unexpected exception

## Callbacks — run code after each publish

Fire a cache-invalidation, revalidation, or Slack notification after each successful post change:

```typescript
const handler = createHandler({
  storage: new SupabaseStorage(),
  onPostChange: async (op, payload) => {
    if (op === 'create_post' || op === 'update_post') {
      await fetch(`https://mysite.com/api/revalidate?slug=${payload.slug}`)
    }
  },
})
```

Callback can be sync or async. Errors in the callback are logged but don't fail the request (the post is already persisted).

## Custom storage

Implement the `StorageAdapter` interface:

```typescript
import type { StorageAdapter, Post } from 'panini-connector'

class MyStore implements StorageAdapter {
  async ping() {
    return { site_name: 'My site', version: '1.0' }
  }
  async create_post(post: Post) {
    // ... your insert code ...
    return { external_id: 'post_42', external_url: 'https://mysite.com/post/42' }
  }
  async update_post(externalId: string, post: Post) {
    // ... your update code ...
    return { external_id: externalId, external_url: '...' }
  }
  async delete_post(externalId: string) {
    // ... your delete code ...
  }
}

createHandler({ storage: new MyStore() })
```

## Peer dependencies

The base install has zero deps. Framework/storage integrations are peer deps you install alongside:

- `express` for Express integration
- `next` for Next.js integrations (both routers)
- `pg` for the Postgres storage adapter

Supabase uses the global `fetch` (Node 18+), no extra deps.

## Envelope format

If you're implementing custom storage or debugging with curl, here's the exact request shape:

```
POST /api/seo-connector
Content-Type: application/json
X-Compass-Timestamp: 1720000000
X-Compass-Signature: sha256=<64-hex>
X-Compass-Version: 1

{
  "op":         "create_post" | "update_post" | "delete_post" | "ping",
  "version":   "1",
  "request_id": "<uuid>",
  "timestamp": "2026-07-05T12:34:56Z",
  "post": {
    "title":              "...",
    "slug":               "...",
    "body_html":          "...",
    "excerpt":            "...",
    "categories":         [...],
    "tags":               [...],
    "featured_image_url": "...",
    "author_name":        "...",
    "seo_meta":           {...},
    "json_ld":            [...],
    "status":             "publish" | "draft"
  },
  "external_id": "..."   // only for update/delete
}
```

Expected response: `HTTP 200` with `{"ok": true, "external_id": "...", "external_url": "..."}`

## License

MIT.
