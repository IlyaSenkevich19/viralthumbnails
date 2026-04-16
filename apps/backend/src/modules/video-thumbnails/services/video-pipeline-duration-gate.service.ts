import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  getVideoPipelineConfig,
  VIDEO_PIPELINE_MAX_DURATION_SECONDS,
} from '../../../config/video-pipeline.config';
import type { UploadedVideoFile } from '../types/upload.types';
import { getVideoDurationSecondsFromBuffer } from '../utils/video-duration-ffprobe';
import { YoutubeVideoMetaService } from './youtube-video-meta.service';
import { fetchYoutubeDurationSecondsFromDataApi } from './youtube-data-api-duration';

/**
 * Phase 0: when duration is known server-side, reject pipeline runs over configured max.
 * YouTube duration requires `YOUTUBE_DATA_API_KEY`. Upload duration uses `ffprobe` when installed.
 */
@Injectable()
export class VideoPipelineDurationGateService {
  private readonly logger = new Logger(VideoPipelineDurationGateService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly youtubeMeta: YoutubeVideoMetaService,
  ) {}

  /**
   * @throws BadRequestException code `VIDEO_EXCEEDS_MAX_DURATION` when duration exceeds policy
   */
  async enforceMaxDurationForPipelineInput(params: {
    videoUrl?: string;
    /** Prefer probing upload buffer over URL when both exist. */
    upload?: UploadedVideoFile;
    logContext: string;
  }): Promise<void> {
    const { youtubeDataApiKey } = getVideoPipelineConfig(this.config);
    const maxDurationSeconds = VIDEO_PIPELINE_MAX_DURATION_SECONDS;

    if (params.upload?.buffer?.length) {
      const seconds = await getVideoDurationSecondsFromBuffer(params.upload.buffer);
      if (seconds === null) {
        this.logger.warn(
          `Phase0 duration: ffprobe unavailable or failed (upload ${params.upload.size} bytes) context=${params.logContext}`,
        );
        return;
      }
      this.logger.log(
        `Phase0 duration: upload probed ${seconds.toFixed(1)}s max=${maxDurationSeconds}s context=${params.logContext}`,
      );
      this.throwIfExceeds(seconds, maxDurationSeconds);
      return;
    }

    const rawUrl = params.videoUrl?.trim();
    if (!rawUrl) return;

    const parsed = this.youtubeMeta.parseUrl(rawUrl);
    if (!parsed.ok || !parsed.videoId) {
      this.logger.warn(
        `Phase0 duration: non-YouTube video_url; duration gate skipped context=${params.logContext}`,
      );
      return;
    }

    if (!youtubeDataApiKey) {
      this.logger.warn(
        `Phase0 duration: YOUTUBE_DATA_API_KEY unset; YouTube length gate skipped context=${params.logContext}`,
      );
      return;
    }

    const seconds = await fetchYoutubeDurationSecondsFromDataApi(parsed.videoId, youtubeDataApiKey);
    if (seconds === null) {
      this.logger.warn(
        `Phase0 duration: YouTube Data API did not return duration context=${params.logContext}`,
      );
      return;
    }

    this.logger.log(
      `Phase0 duration: YouTube ${seconds.toFixed(1)}s max=${maxDurationSeconds}s context=${params.logContext}`,
    );
    this.throwIfExceeds(seconds, maxDurationSeconds);
  }

  private throwIfExceeds(seconds: number, maxDurationSeconds: number): void {
    if (seconds <= maxDurationSeconds) return;

    const minutes = Math.max(1, Math.round(seconds / 60));
    const maxMin = Math.max(1, Math.round(maxDurationSeconds / 60));
    throw new BadRequestException({
      code: 'VIDEO_EXCEEDS_MAX_DURATION',
      message: `This video is about ${minutes} minutes long. The maximum length for analysis is ${maxMin} minutes (${maxDurationSeconds}s). Use a shorter clip or trim the file.`,
    });
  }
}
