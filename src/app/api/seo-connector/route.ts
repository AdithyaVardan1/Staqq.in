import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const SECRET = process.env.SEO_CONNECTOR_SECRET!
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: Request) {
  const ts = req.headers.get('x-compass-timestamp') ?? ''
  const sig = req.headers.get('x-compass-signature') ?? ''
  const raw = await req.text()

  if (!ts || Math.abs(Date.now() / 1000 - Number(ts)) > 300) {
    return Response.json({ ok: false, error: 'stale or missing timestamp' }, { status: 401 })
  }

  const expected = 'sha256=' + crypto
    .createHmac('sha256', SECRET)
    .update(`${ts}.${raw}`)
    .digest('hex')

  if (
    expected.length !== sig.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
  ) {
    return Response.json({ ok: false, error: 'bad signature' }, { status: 401 })
  }

  const payload = JSON.parse(raw)

  if (payload.op === 'ping') {
    return Response.json({
      ok: true,
      site_name: 'Staqq',
      version: '1',
      supported_ops: ['create_post'],
    })
  }

  if (payload.op === 'create_post') {
    const p = payload.post

    // Idempotency: return same result if Compass retries with the same request_id
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id, slug')
      .eq('external_request_id', payload.request_id)
      .maybeSingle()

    if (existing) {
      return Response.json({
        ok: true,
        external_id: existing.id,
        external_url: `https://staqq.in/blog/${existing.slug}`,
      })
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        title: p.title,
        slug: p.slug,
        // body_html stores the HTML from Compass; content is required by the schema
        // so we strip tags as a plain-text fallback for the description/content field
        body_html: p.body_html,
        content: p.body_html,
        description: p.excerpt ?? p.seo_meta?.description ?? '',
        category: 'seo',
        status: p.status ?? 'published',
        meta_title: p.seo_meta?.title ?? null,
        meta_description: p.seo_meta?.description ?? null,
        featured_image_url: p.featured_image_url ?? null,
        author_name: p.author_name ?? null,
        external_source: 'compass',
        external_request_id: payload.request_id,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id, slug')
      .single()

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 })
    }

    return Response.json({
      ok: true,
      external_id: data.id,
      external_url: `https://staqq.in/blog/${data.slug}`,
    })
  }

  return Response.json({ ok: false, error: `unsupported op: ${payload.op}` }, { status: 400 })
}
