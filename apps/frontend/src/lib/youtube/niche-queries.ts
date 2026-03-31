/**
 * Search phrases per catalog niche (English works best for YouTube’s index).
 * “Clickability” here ≈ high view counts (API does not expose real CTR).
 */
export const YOUTUBE_INSPIRATION_NICHES = [
  { code: 'cooking', label: 'Cooking', query: 'cooking recipe tutorial' },
  { code: 'gaming', label: 'Gaming', query: 'gaming gameplay highlights' },
  { code: 'tech', label: 'Tech', query: 'tech review smartphone laptop' },
  { code: 'vlog', label: 'Vlog', query: 'daily vlog lifestyle' },
  { code: 'business', label: 'Business', query: 'business entrepreneur success' },
] as const;

export type YoutubeInspirationNicheCode = (typeof YOUTUBE_INSPIRATION_NICHES)[number]['code'];

export function youtubeQueryForNiche(code: string): string | undefined {
  const row = YOUTUBE_INSPIRATION_NICHES.find((n) => n.code === code);
  return row?.query;
}
