export const THUMBNAIL_STYLE_MATRIX = [
  'Bold hook',
  'Clean minimal',
  'Emotional reaction',
  'Authority / educational',
  'Curiosity gap',
  'News / urgency',
] as const;

export function pickThumbnailStyles(count: number): string[] {
  const safeCount = Math.max(1, Math.floor(count));
  const out: string[] = [];
  for (let i = 0; i < safeCount; i++) {
    out.push(THUMBNAIL_STYLE_MATRIX[i % THUMBNAIL_STYLE_MATRIX.length]);
  }
  return out;
}

