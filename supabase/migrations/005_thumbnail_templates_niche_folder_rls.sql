-- Allow authenticated users to read catalog templates stored at bucket root as `<niche>/...`
-- (e.g. cooking/thumb_2.jpg). Codes must match apps/backend/.../template-niches.ts.
DROP POLICY IF EXISTS "thumbnail_templates_select_niche_folders" ON storage.objects;
CREATE POLICY "thumbnail_templates_select_niche_folders"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'thumbnail-templates'
    AND (storage.foldername(name))[1] IN (
      'business',
      'cooking',
      'gaming',
      'tech',
      'vlog'
    )
  );
