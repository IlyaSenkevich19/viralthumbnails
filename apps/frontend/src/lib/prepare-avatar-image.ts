const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;
/** Keep originals under this size (bytes) as-is when already JPEG/WebP. */
const SKIP_RESIZE_BELOW = 900_000;

/**
 * Shrinks large face photos before base64 upload so JSON stays under proxy limits (e.g. Vercel ~4.5MB).
 */
export async function prepareAvatarImageFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (file.size <= SKIP_RESIZE_BELOW && file.type !== 'image/png') {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY),
    );
    if (!blob) return file;

    const base = file.name.replace(/\.[^.]+$/, '') || 'face';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
  } finally {
    bitmap.close();
  }
}
