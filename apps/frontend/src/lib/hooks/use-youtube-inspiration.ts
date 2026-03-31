'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { YoutubeInspirationItem } from '@/lib/youtube/inspiration-types';

export type YoutubeInspirationResponse = {
  items: YoutubeInspirationItem[];
  disclaimer?: string;
};

const STALE_MS = 5 * 60 * 1000;

export type UseYoutubeInspirationOptions = {
  nicheCode: string;
  perNiche?: number;
  videoDuration?: string;
  /** RFC3339; empty = omit param */
  publishedAfter?: string;
};

export function useYoutubeInspiration({
  nicheCode,
  perNiche = 4,
  videoDuration = 'medium',
  publishedAfter = '',
}: UseYoutubeInspirationOptions) {
  return useQuery({
    queryKey: queryKeys.youtube.inspiration(
      nicheCode,
      perNiche,
      videoDuration,
      publishedAfter,
    ),
    queryFn: async (): Promise<YoutubeInspirationResponse> => {
      const params = new URLSearchParams({
        niche: nicheCode,
        perNiche: String(perNiche),
        videoDuration,
      });
      if (publishedAfter.trim()) {
        params.set('publishedAfter', publishedAfter.trim());
      }
      const res = await fetch(`/api/youtube/inspiration?${params.toString()}`);
      const json = (await res.json()) as YoutubeInspirationResponse & {
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(json.message || json.error || `HTTP ${res.status}`);
      }
      return { items: json.items ?? [], disclaimer: json.disclaimer };
    },
    staleTime: STALE_MS,
  });
}
