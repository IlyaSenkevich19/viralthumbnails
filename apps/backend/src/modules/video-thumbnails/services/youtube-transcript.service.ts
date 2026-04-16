import { Injectable, Logger } from '@nestjs/common';
import {
  VIDEO_PIPELINE_CACHE_MAX_ENTRIES,
  VIDEO_PIPELINE_CACHE_TTL_MS,
} from '../../../config/video-pipeline.config';
import { YoutubeVideoMetaService } from './youtube-video-meta.service';

const TRANSCRIPT_FETCH_TIMEOUT_MS = 4500;
const TRANSCRIPT_MAX_CHARS = 3000;
const TRANSCRIPT_MAX_LINES = 60;

type CaptionTrack = {
  langCode: string;
  name: string | null;
};

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const n = Number.parseInt(dec, 10);
      return Number.isFinite(n) ? String.fromCharCode(n) : '';
    });
}

function stripXmlTags(input: string): string {
  return input.replace(/<[^>]+>/g, ' ');
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function parseCaptionTracks(xml: string): CaptionTrack[] {
  const tracks: CaptionTrack[] = [];
  const re = /<track\b([^>]*)\/>/gi;
  for (const m of xml.matchAll(re)) {
    const attrs = m[1] ?? '';
    const lang = /lang_code="([^"]+)"/i.exec(attrs)?.[1]?.trim();
    if (!lang) continue;
    const nameRaw = /name="([^"]*)"/i.exec(attrs)?.[1] ?? '';
    tracks.push({ langCode: lang, name: normalizeWhitespace(decodeXmlEntities(nameRaw)) || null });
  }
  return tracks;
}

function pickPreferredTrack(tracks: CaptionTrack[]): CaptionTrack | null {
  if (tracks.length === 0) return null;
  const preferred = ['en', 'en-US', 'en-GB', 'ru', 'uk'];
  for (const code of preferred) {
    const hit = tracks.find((t) => t.langCode.toLowerCase() === code.toLowerCase());
    if (hit) return hit;
  }
  return tracks[0] ?? null;
}

function parseTranscriptText(xml: string): string {
  const chunks: string[] = [];
  const re = /<text\b[^>]*>([\s\S]*?)<\/text>/gi;
  for (const m of xml.matchAll(re)) {
    const raw = m[1] ?? '';
    const line = normalizeWhitespace(decodeXmlEntities(stripXmlTags(raw)));
    if (!line) continue;
    chunks.push(line);
    if (chunks.length >= TRANSCRIPT_MAX_LINES) break;
  }

  let merged = chunks.join(' ').trim();
  if (merged.length > TRANSCRIPT_MAX_CHARS) {
    merged = `${merged.slice(0, TRANSCRIPT_MAX_CHARS - 1).trimEnd()}…`;
  }
  return merged;
}

async function fetchTextWithTimeout(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSCRIPT_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

@Injectable()
export class YoutubeTranscriptService {
  private readonly logger = new Logger(YoutubeTranscriptService.name);
  private readonly cache = new Map<string, { expiresAt: number; transcript: string | null }>();

  constructor(private readonly youtubeMeta: YoutubeVideoMetaService) {}

  private pruneCache(now: number): void {
    for (const [k, v] of this.cache.entries()) {
      if (v.expiresAt <= now) this.cache.delete(k);
    }
    while (this.cache.size > VIDEO_PIPELINE_CACHE_MAX_ENTRIES) {
      const oldest = this.cache.keys().next().value as string | undefined;
      if (!oldest) break;
      this.cache.delete(oldest);
    }
  }

  async tryFetchCompactTranscript(rawUrl: string, logContext: string): Promise<string | null> {
    const parsed = this.youtubeMeta.parseUrl(rawUrl);
    if (!parsed.ok || !parsed.videoId) return null;
    const cacheKey = parsed.videoId;
    const now = Date.now();
    this.pruneCache(now);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      this.logger.debug(
        `[${logContext}] transcript cache hit videoId=${parsed.videoId} hasText=${Boolean(cached.transcript)}`,
      );
      return cached.transcript;
    }

    const listUrl = `https://video.google.com/timedtext?type=list&v=${encodeURIComponent(parsed.videoId)}`;
    const listXml = await fetchTextWithTimeout(listUrl);
    if (!listXml) return null;

    const tracks = parseCaptionTracks(listXml);
    const track = pickPreferredTrack(tracks);
    if (!track) {
      this.cache.set(cacheKey, { expiresAt: now + VIDEO_PIPELINE_CACHE_TTL_MS, transcript: null });
      return null;
    }

    const transcriptUrl = `https://video.google.com/timedtext?v=${encodeURIComponent(parsed.videoId)}&lang=${encodeURIComponent(track.langCode)}`;
    const transcriptXml = await fetchTextWithTimeout(transcriptUrl);
    if (!transcriptXml) return null;

    const transcript = parseTranscriptText(transcriptXml);
    if (!transcript) {
      this.cache.set(cacheKey, { expiresAt: now + VIDEO_PIPELINE_CACHE_TTL_MS, transcript: null });
      return null;
    }

    this.logger.log(
      `[${logContext}] fetched YouTube transcript snippet lang=${track.langCode} chars=${transcript.length}`,
    );
    this.cache.set(cacheKey, { expiresAt: now + VIDEO_PIPELINE_CACHE_TTL_MS, transcript });
    return transcript;
  }
}

