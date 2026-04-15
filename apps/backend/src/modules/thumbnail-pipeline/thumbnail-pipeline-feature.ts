import {
  CanActivate,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

/**
 * Whether `POST /thumbnails/pipeline/run` is allowed.
 * - Explicit `THUMBNAIL_PIPELINE_ENABLED=1|true|yes` → allowed
 * - Explicit `0|false|no` → denied
 * - Unset + `NODE_ENV=production` → denied (safe deploy default)
 * - Unset otherwise → allowed (local DX)
 */
export function isThumbnailPipelineEnabled(): boolean {
  const v = process.env.THUMBNAIL_PIPELINE_ENABLED?.trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes') return true;
  if (v === '0' || v === 'false' || v === 'no') return false;
  if (process.env.NODE_ENV === 'production') return false;
  return true;
}

@Injectable()
export class ThumbnailPipelineEnabledGuard implements CanActivate {
  canActivate(): boolean {
    if (isThumbnailPipelineEnabled()) return true;
    throw new ServiceUnavailableException(
      'Thumbnail pipeline is disabled. Set THUMBNAIL_PIPELINE_ENABLED=1 in production when ready.',
    );
  }
}
