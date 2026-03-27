-- User-uploaded face images for future thumbnail / face-swap flows

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'user-avatars',
    'user-avatars',
    false,
    10485760,
    ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]
  )
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "user_avatars_select_own" ON storage.objects;
CREATE POLICY "user_avatars_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "user_avatars_insert_own" ON storage.objects;
CREATE POLICY "user_avatars_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "user_avatars_update_own" ON storage.objects;
CREATE POLICY "user_avatars_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "user_avatars_delete_own" ON storage.objects;
CREATE POLICY "user_avatars_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE TABLE IF NOT EXISTS user_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My face',
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_avatars_user_id_created ON user_avatars (user_id, created_at DESC);

ALTER TABLE user_avatars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_avatars_select" ON user_avatars;
CREATE POLICY "user_avatars_select" ON user_avatars
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_avatars_insert" ON user_avatars;
CREATE POLICY "user_avatars_insert" ON user_avatars
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_avatars_update" ON user_avatars;
CREATE POLICY "user_avatars_update" ON user_avatars
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_avatars_delete" ON user_avatars;
CREATE POLICY "user_avatars_delete" ON user_avatars
  FOR DELETE USING (user_id = auth.uid());
