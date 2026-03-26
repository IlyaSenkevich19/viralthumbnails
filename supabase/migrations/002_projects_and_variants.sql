-- Projects + thumbnail variants + profile billing flags (ViralThumbnails feature schema)

-- Extend profiles (User-facing fields beyond auth.users)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS is_pro BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled project',
  platform TEXT NOT NULL DEFAULT 'youtube',
  source_type TEXT NOT NULL CHECK (
    source_type IN ('youtube_url', 'video', 'script', 'text')
  ),
  source_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'pending', 'generating', 'done', 'failed')
  ),
  cover_thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select_own" ON projects;
CREATE POLICY "projects_select_own" ON projects
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "projects_insert_own" ON projects;
CREATE POLICY "projects_insert_own" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "projects_update_own" ON projects;
CREATE POLICY "projects_update_own" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "projects_delete_own" ON projects;
CREATE POLICY "projects_delete_own" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- thumbnail_variants
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thumbnail_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  generated_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'generating', 'done', 'failed')
  ),
  template_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thumbnail_variants_project_id ON thumbnail_variants(project_id);

ALTER TABLE thumbnail_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "thumbnail_variants_select_via_project" ON thumbnail_variants;
CREATE POLICY "thumbnail_variants_select_via_project" ON thumbnail_variants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = thumbnail_variants.project_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "thumbnail_variants_insert_via_project" ON thumbnail_variants;
CREATE POLICY "thumbnail_variants_insert_via_project" ON thumbnail_variants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = thumbnail_variants.project_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "thumbnail_variants_update_via_project" ON thumbnail_variants;
CREATE POLICY "thumbnail_variants_update_via_project" ON thumbnail_variants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = thumbnail_variants.project_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "thumbnail_variants_delete_via_project" ON thumbnail_variants;
CREATE POLICY "thumbnail_variants_delete_via_project" ON thumbnail_variants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = thumbnail_variants.project_id AND p.user_id = auth.uid()
    )
  );
