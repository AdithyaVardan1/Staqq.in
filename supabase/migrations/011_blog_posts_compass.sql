-- Add columns needed for Compass SEO connector integration
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS body_html       text,
  ADD COLUMN IF NOT EXISTS status          text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS meta_title      text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS featured_image_url text,
  ADD COLUMN IF NOT EXISTS author_name     text,
  ADD COLUMN IF NOT EXISTS external_source text,
  ADD COLUMN IF NOT EXISTS external_request_id text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_blog_posts_external_request_id
  ON blog_posts(external_request_id);
