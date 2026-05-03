import type { ThumbnailImageModelTier } from '../../../config/openrouter-models';
import type { PipelineVideoContext } from '../../video-thumbnails/types/video-pipeline-video-context';
import type { ThumbnailPipelineAnalysis } from '../schemas/thumbnail-pipeline-analysis.schema';

export type ThumbnailPipelineRunInput = {
  userId: string;
  projectId?: string;
  userPrompt: string;
  style?: string;
  /** Public HTTPS or signed URL after ingestion. Omit for prompt-only (and optional reference images). */
  videoUrl?: string;
  /** Phase 1+: duration probe for bounded frame sampling (Phase 2 VL input). */
  videoContext?: PipelineVideoContext;
  templateReferenceDataUrls?: string[];
  templateId?: string;
  faceReferenceDataUrls?: string[];
  avatarId?: string;
  variantCount?: number;
  /** When false, only structured analysis is returned (no image API calls). */
  generateImages?: boolean;
  /** `default` = FLUX.2 Pro; `premium` = FLUX.2 Max (slugs in `openrouter-models`). */
  imageModelTier?: ThumbnailImageModelTier;
  prioritizeFace?: boolean;
  /** Base image for the editing layer (`data:image/...;base64,...`). */
  baseImageDataUrl?: string;
  editInstruction?: string;
};

export type ThumbnailPipelineVariant = {
  index: number;
  prompt: string;
  buffer: Buffer;
  contentType: string;
};

export type ThumbnailPipelineRunResult = {
  runId: string;
  /** Same amount reserved up-front; refunded in full on failure. */
  creditsCharged: number;
  analysis: ThumbnailPipelineAnalysis;
  videoAnalysis?: {
    frameExtractionMode?: 'direct_url' | 'yt_dlp_stream' | 'text_context_no_video_url';
    sampledFrames?: Array<{
      frameIndex: number;
      timeSec: number;
      selected?: boolean;
      source?: 'direct_url' | 'yt_dlp_stream';
    }>;
    selectedFramePreviewDataUrl?: string;
  };
  imagePromptsUsed: string[];
  variants?: ThumbnailPipelineVariant[];
  edited?: { buffer: Buffer; contentType: string };
  modelsUsed: {
    videoUnderstanding: string;
    textRefinement?: string;
    imageGeneration?: string;
    imageEdit?: string;
  };
  /** e.g. multimodal prompt truncation when reference images are attached. */
  warnings?: string[];
};
