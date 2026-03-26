/** Turn `youtube_url` → `youtube url` for UI labels. */
export function humanizeKey(s: string): string {
  return s.replace(/_/g, ' ');
}
