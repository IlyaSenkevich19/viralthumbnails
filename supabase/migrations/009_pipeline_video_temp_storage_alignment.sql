-- Align project-thumbnails bucket settings with pipeline/run-video ingest behavior.
-- The backend accepts video temp uploads up to 80MB before analysis, so bucket limits
-- and mime allowlist must include video content types used by FileInterceptor uploads.

UPDATE storage.buckets
SET
  file_size_limit = 104857600, -- 100MB safety margin for 80MB API limit
  allowed_mime_types = ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/octet-stream'
  ]::text[]
WHERE id = 'project-thumbnails';
