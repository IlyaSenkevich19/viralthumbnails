import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getVideoPipelineConfig } from '../../../config/video-pipeline.config';
import { fetchYoutubeDurationSecondsFromDataApi } from './youtube-data-api-duration';

export type ParsedVideoUrl = {
  ok: boolean;
  platform: 'youtube' | 'unknown';
  originalUrl: string;
  normalizedUrl: string;
  videoId: string | null;
  reason?: string;
};

export type YoutubeVideoMeta = {
  code: '0' | '1';
  message: string;
  data: {
    title: string | null;
    author: string | null;
    thumbnail: string | null;
    url: string;
    video_id: string | null;
    video_platform: 'youtube';
    source: 'oembed';
    /** Seconds; set when `YOUTUBE_DATA_API_KEY` is configured (Phase 1). */
    duration_seconds?: number | null;
  } | null;
};

const OEMBED_TIMEOUT_MS = 4500;

@Injectable()
export class YoutubeVideoMetaService {
  private readonly logger = new Logger(YoutubeVideoMetaService.name);

  constructor(private readonly config: ConfigService) {}

  parseUrl(rawUrl: string): ParsedVideoUrl {
    const originalUrl = rawUrl?.trim() ?? '';
    if (!originalUrl) {
      return {
        ok: false,
        platform: 'unknown',
        originalUrl,
        normalizedUrl: originalUrl,
        videoId: null,
        reason: 'URL is empty',
      };
    }

    let parsed: URL;
    try {
      parsed = new URL(originalUrl);
    } catch {
      return {
        ok: false,
        platform: 'unknown',
        originalUrl,
        normalizedUrl: originalUrl,
        videoId: null,
        reason: 'URL is invalid',
      };
    }

    const host = parsed.hostname.toLowerCase();
    const isYouTubeHost =
      host === 'youtube.com' ||
      host === 'www.youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtu.be';
    if (!isYouTubeHost) {
      return {
        ok: false,
        platform: 'unknown',
        originalUrl,
        normalizedUrl: originalUrl,
        videoId: null,
        reason: 'Only YouTube URLs are supported',
      };
    }

    let videoId: string | null = null;
    if (host === 'youtu.be') {
      const slug = parsed.pathname.replace(/^\/+/, '').split('/')[0];
      videoId = slug || null;
    } else if (parsed.pathname.startsWith('/watch')) {
      videoId = parsed.searchParams.get('v');
    } else if (parsed.pathname.startsWith('/shorts/')) {
      videoId = parsed.pathname.split('/')[2] ?? null;
    } else if (parsed.pathname.startsWith('/embed/')) {
      videoId = parsed.pathname.split('/')[2] ?? null;
    }

    const cleanVideoId = videoId?.trim() ?? '';
    if (!cleanVideoId) {
      return {
        ok: false,
        platform: 'youtube',
        originalUrl,
        normalizedUrl: originalUrl,
        videoId: null,
        reason: 'Could not extract YouTube video ID',
      };
    }

    const normalizedUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(cleanVideoId)}`;
    return {
      ok: true,
      platform: 'youtube',
      originalUrl,
      normalizedUrl,
      videoId: cleanVideoId,
    };
  }

  async getVideoMeta(rawUrl: string): Promise<YoutubeVideoMeta> {
    const parsed = this.parseUrl(rawUrl);
    if (!parsed.ok || !parsed.videoId) {
      return {
        code: '1',
        message: parsed.reason ?? 'Invalid URL',
        data: null,
      };
    }

    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(parsed.normalizedUrl)}&format=json`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OEMBED_TIMEOUT_MS);

    try {
      const res = await fetch(oembedUrl, { signal: controller.signal });
      if (!res.ok) {
        return {
          code: '1',
          message: `oEmbed failed (${res.status})`,
          data: null,
        };
      }

      const json = (await res.json()) as Record<string, unknown>;
      const title = typeof json.title === 'string' ? json.title.trim() : null;
      const author = typeof json.author_name === 'string' ? json.author_name.trim() : null;
      const thumbnail = typeof json.thumbnail_url === 'string' ? json.thumbnail_url.trim() : null;

      const { youtubeDataApiKey } = getVideoPipelineConfig(this.config);
      let durationSeconds: number | null | undefined;
      if (youtubeDataApiKey) {
        durationSeconds = await fetchYoutubeDurationSecondsFromDataApi(parsed.videoId, youtubeDataApiKey);
      }

      return {
        code: '0',
        message: 'Succeed',
        data: {
          title,
          author,
          thumbnail,
          url: parsed.normalizedUrl,
          video_id: `youtube_${parsed.videoId}`,
          video_platform: 'youtube',
          source: 'oembed',
          duration_seconds: durationSeconds ?? null,
        },
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`getVideoMeta failed: ${msg}`);
      return {
        code: '1',
        message: 'Could not fetch video metadata',
        data: null,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

