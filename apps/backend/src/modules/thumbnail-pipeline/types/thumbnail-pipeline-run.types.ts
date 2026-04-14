import type { ThumbnailPipelineAnalysis } from '../schemas/thumbnail-pipeline-analysis.schema';

export type ThumbnailPipelineRunInput = {
  userPrompt: string;
  style?: string;
  /** Public HTTPS or signed URL after ingestion. Omit for prompt-only (and optional reference images). */
  videoUrl?: string;
  templateReferenceDataUrls?: string[];
  faceReferenceDataUrls?: string[];
  variantCount?: number;
  /** When false, only structured analysis is returned (no image API calls). */
  generateImages?: boolean;
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
  analysis: ThumbnailPipelineAnalysis;
  imagePromptsUsed: string[];
  variants?: ThumbnailPipelineVariant[];
  edited?: { buffer: Buffer; contentType: string };
  modelsUsed: {
    videoUnderstanding: string;
    textRefinement?: string;
    imageGeneration?: string;
    imageEdit?: string;
  };
};
