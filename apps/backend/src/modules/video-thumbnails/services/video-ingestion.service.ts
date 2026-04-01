import { BadRequestException, Injectable } from '@nestjs/common';
import { StorageService } from '../../storage/storage.service';
import type { UploadedVideoFile } from '../types/upload.types';

export type ResolvedVideoSource = {
  url: string;
  tempStoragePath?: string;
};

const ALLOWED_VIDEO_MIME = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/octet-stream',
]);

@Injectable()
export class VideoIngestionService {
  constructor(private readonly storage: StorageService) {}

  async resolve(params: {
    userId: string;
    runId: string;
    videoUrl?: string;
    file?: UploadedVideoFile;
  }): Promise<ResolvedVideoSource> {
    const { userId, runId, videoUrl, file } = params;

    if (file?.buffer?.length) {
      const mime = file.mimetype || 'video/mp4';
      if (!ALLOWED_VIDEO_MIME.has(mime) && !mime.startsWith('video/')) {
        throw new BadRequestException(`Unsupported video type: ${mime}`);
      }
      const { path, signedUrl } = await this.storage.uploadTemporaryVideoForAnalysis({
        userId,
        runId,
        body: file.buffer,
        contentType: mime,
      });
      return { url: signedUrl, tempStoragePath: path };
    }

    const url = videoUrl?.trim();
    if (!url) {
      throw new BadRequestException('Provide either videoUrl or a file upload (field name: file).');
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException('Invalid videoUrl');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException('videoUrl must be http(s)');
    }

    return { url };
  }
}
