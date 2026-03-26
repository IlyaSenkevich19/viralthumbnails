-- Optional niche/category for templates (system catalog + user uploads)
ALTER TABLE thumbnail_templates
  ADD COLUMN IF NOT EXISTS niche TEXT;

COMMENT ON COLUMN thumbnail_templates.niche IS
  'Niche slug for filtering (cooking, gaming, …). NULL = uncategorized / storage-only rows.';

CREATE INDEX IF NOT EXISTS thumbnail_templates_system_niche
  ON thumbnail_templates (niche)
  WHERE user_id IS NULL AND niche IS NOT NULL;
