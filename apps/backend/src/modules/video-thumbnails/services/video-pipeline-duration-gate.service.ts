import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  getVideoPipelineConfig,
  VIDEO_PIPELINE_MAX_DURATION_SECONDS,
} from '../../../config/video-pipeline.config';
import type { PipelineVideoContext } from '../types/video-pipeline-video-context';
import type { UploadedVideoFile } from '../types/upload.types';
import { getVideoDurationSecondsFromBuffer } from '../utils/video-duration-ffprobe';
import { YoutubeVideoMetaService } from './youtube-video-meta.service';
import { fetchYoutubeDurationSecondsFromDataApi } from './youtube-data-api-duration';

/**
 * Phase 0–1: measure video duration server-side, enforce max length, expose metadata for API + persistence.
 */
@Injectable()
export class VideoPipelineDurationGateService {
  private readonly logger = new Logger(VideoPipelineDurationGateService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly youtubeMeta: YoutubeVideoMetaService,
  ) {}

  /**
   * When there is no video input, returns `undefined`.
   * When duration is known and exceeds policy, throws `VIDEO_EXCEEDS_MAX_DURATION`.
   * Otherwise returns {@link PipelineVideoContext} for responses and `source_data`.
   */
  async resolveContextAndEnforceForPipeline(params: {
    videoUrl?: string;
    upload?: UploadedVideoFile;
    logContext: string;
  }): Promise<PipelineVideoContext | undefined> {
    const maxDurationSeconds = VIDEO_PIPELINE_MAX_DURATION_SECONDS;
    const hasUpload = Boolean(params.upload?.buffer?.length);
    const hasUrl = Boolean(params.videoUrl?.trim());
    if (!hasUpload && !hasUrl) return undefined;

    let durationSeconds: number | null = null;
    let durationResolution: PipelineVideoContext['duration_resolution'] = 'unavailable';

    if (hasUpload && params.upload) {
      durationSeconds = await getVideoDurationSecondsFromBuffer(params.upload.buffer);
      if (durationSeconds === null) {
        this.logger.warn(
          `Phase1 duration: ffprobe unavailable or failed (upload ${params.upload.size} bytes) context=${params.logContext}`,
        );
      } else {
        durationResolution = 'ffprobe_upload';
        this.logger.log(
          `Phase1 duration: upload probed ${durationSeconds.toFixed(1)}s max=${maxDurationSeconds}s context=${params.logContext}`,
        );
      }
    } else if (hasUrl) {
      const rawUrl = params.videoUrl!.trim();
      const parsed = this.youtubeMeta.parseUrl(rawUrl);
      const { youtubeDataApiKey } = getVideoPipelineConfig(this.config);

      if (!parsed.ok || !parsed.videoId) {
        this.logger.warn(
          `Phase1 duration: non-YouTube video_url; duration unknown context=${params.logContext}`,
        );
      } else if (!youtubeDataApiKey) {
        this.logger.warn(
          `Phase1 duration: YOUTUBE_DATA_API_KEY unset; YouTube duration unknown context=${params.logContext}`,
        );
      } else {
        durationSeconds = await fetchYoutubeDurationSecondsFromDataApi(parsed.videoId, youtubeDataApiKey);
        if (durationSeconds === null) {
          this.logger.warn(
            `Phase1 duration: YouTube Data API did not return duration context=${params.logContext}`,
          );
        } else {
          durationResolution = 'youtube_data_api';
          this.logger.log(
            `Phase1 duration: YouTube ${durationSeconds.toFixed(1)}s max=${maxDurationSeconds}s context=${params.logContext}`,
          );
        }
      }
    }

    if (durationSeconds !== null && durationSeconds > maxDurationSeconds) {
      this.throwIfExceeds(durationSeconds, maxDurationSeconds);
    }

    return {
      duration_seconds: durationSeconds,
      duration_resolution: durationResolution,
      max_duration_seconds: maxDurationSeconds,
      analyzed_window: {
        start_sec: 0,
        end_sec: durationSeconds,
      },
    };
  }

  private throwIfExceeds(seconds: number, maxDurationSeconds: number): void {
    const minutes = Math.max(1, Math.round(seconds / 60));
    const maxMin = Math.max(1, Math.round(maxDurationSeconds / 60));
    throw new BadRequestException({
      code: 'VIDEO_EXCEEDS_MAX_DURATION',
      message: `This video is about ${minutes} minutes long. The maximum length for analysis is ${maxMin} minutes (${maxDurationSeconds}s). Use a shorter clip or trim the file.`,
    });
  }
}
