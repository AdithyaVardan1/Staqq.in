import { createHandler } from 'panini-connector/next-app'
import { SupabaseStorage } from 'panini-connector/storage/supabase'

export const runtime = 'nodejs'

// Built lazily on first request — never at module load — so `next build`'s
// page-data collection doesn't construct SupabaseStorage (which throws when
// credentials aren't present at build time).
let handler: ReturnType<typeof createHandler> | null = null

function getHandler() {
  if (!handler) {
    handler = createHandler({
      storage: new SupabaseStorage({
        table: 'blog_posts',
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        service_role_key: process.env.SUPABASE_SERVICE_ROLE_KEY,
        externalIdColumn: 'id',
        externalUrlTemplate: 'https://staqq.in/blog/{slug}',
        toRow: (post: any) => ({
          // Map Panini fields → your columns. Edit to match your schema.
          title: post.title,
          slug: post.slug,
          content: post.body_html,
          description: post.excerpt || post.seo_meta?.description || '',
          meta_title: post.seo_meta?.title || post.title,
          meta_description: post.seo_meta?.description || post.excerpt,
          featured_image_url: post.featured_image_url,
          author_name: post.author_name,
          status: post.status || 'published',
          // Extra columns your schema requires — add/remove freely
          category: 'seo',
          external_source: 'panini',
          published_at: new Date().toISOString(),
        }),
      }),
    })
  }
  return handler
}

export async function POST(req: Request) {
  return getHandler()(req)
}
