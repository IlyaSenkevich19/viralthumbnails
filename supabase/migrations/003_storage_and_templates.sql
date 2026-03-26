-- Supabase Storage buckets (S3-compatible API) + thumbnail_templates + paths for generated assets

-- ---------------------------------------------------------------------------
-- Buckets (private; access via signed URLs or service role)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'project-thumbnails',
    'project-thumbnails',
    false,
    52428800,
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']::text[]
  ),
  (
    'thumbnail-templates',
    'thumbnail-templates',
    false,
    52428800,
    ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]
  )
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Storage policies: project-thumbnails/{user_id}/{project_id}/variants/...
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "project_thumbnails_select_own" ON storage.objects;
CREATE POLICY "project_thumbnails_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-thumbnails'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "project_thumbnails_insert_own" ON storage.objects;
CREATE POLICY "project_thumbnails_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-thumbnails'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "project_thumbnails_update_own" ON storage.objects;
CREATE POLICY "project_thumbnails_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-thumbnails'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "project_thumbnails_delete_own" ON storage.objects;
CREATE POLICY "project_thumbnails_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-thumbnails'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Storage policies: thumbnail-templates/system/* and thumbnail-templates/{user_id}/*
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "thumbnail_templates_select_system" ON storage.objects;
CREATE POLICY "thumbnail_templates_select_system"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'thumbnail-templates'
    AND (storage.foldername(name))[1] = 'system'
  );

DROP POLICY IF EXISTS "thumbnail_templates_select_own" ON storage.objects;
CREATE POLICY "thumbnail_templates_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'thumbnail-templates'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "thumbnail_templates_insert_own" ON storage.objects;
CREATE POLICY "thumbnail_templates_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'thumbnail-templates'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "thumbnail_templates_update_own" ON storage.objects;
CREATE POLICY "thumbnail_templates_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'thumbnail-templates'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "thumbnail_templates_delete_own" ON storage.objects;
CREATE POLICY "thumbnail_templates_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'thumbnail-templates'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- DB: template metadata (files live in bucket thumbnail-templates)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thumbnail_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/png',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS thumbnail_templates_system_slug
  ON thumbnail_templates (slug) WHERE user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS thumbnail_templates_user_slug
  ON thumbnail_templates (user_id, slug) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS thumbnail_templates_user_id ON thumbnail_templates(user_id);

ALTER TABLE thumbnail_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "thumbnail_templates_select" ON thumbnail_templates;
CREATE POLICY "thumbnail_templates_select" ON thumbnail_templates
  FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "thumbnail_templates_insert" ON thumbnail_templates;
CREATE POLICY "thumbnail_templates_insert" ON thumbnail_templates
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "thumbnail_templates_update" ON thumbnail_templates;
CREATE POLICY "thumbnail_templates_update" ON thumbnail_templates
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "thumbnail_templates_delete" ON thumbnail_templates;
CREATE POLICY "thumbnail_templates_delete" ON thumbnail_templates
  FOR DELETE USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Variant + project: optional Storage object path (signed URL at read time)
-- ---------------------------------------------------------------------------
ALTER TABLE thumbnail_variants
  ADD COLUMN IF NOT EXISTS generated_image_storage_path TEXT;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS cover_thumbnail_storage_path TEXT;
