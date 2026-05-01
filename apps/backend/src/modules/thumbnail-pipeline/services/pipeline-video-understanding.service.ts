import { Injectable, Logger } from '@nestjs/common';
import { PIPELINE_STEP_MODELS } from '../../../config/openrouter-models';
import { extractJsonObject } from '../../../common/json/extract-json-object';
import { approximateOpenRouterMessagesPayloadChars } from '../../openrouter/approximate-message-payload-chars';
import { OpenRouterClient } from '../../openrouter/openrouter.client';
import { requestPipelineVlAnalysis } from '../../openrouter/openrouter-requests';
import {
  userContentTextThenReferenceImages,
  userContentTextVideoThenReferenceImages,
} from '../../openrouter/multipart-user-content';
import type { OpenRouterMessage } from '../../openrouter/openrouter.types';
import type { PipelineVideoContext } from '../../video-thumbnails/types/video-pipeline-video-context';
import {
  type VideoFrameSampleCandidate,
  VideoFrameSampleService,
} from '../../video-thumbnails/services/video-frame-sample.service';
import {
  ThumbnailPipelineAnalysis,
  ThumbnailPipelineAnalysisJsonPrompt,
  ThumbnailPipelineAnalysisSchema,
} from '../schemas/thumbnail-pipeline-analysis.schema';

const MAX_JSON_RETRIES = 2;
const VL_MAX_TOKENS = 3072;

export type VideoUnderstandingParams = {
  userPrompt: string;
  style?: string;
  videoUrl?: string;
  /** Phase 1+: duration for bounded frame sampling. */
  videoContext?: PipelineVideoContext;
  /** Phase 3: compact transcript snippet (e.g., YouTube captions) when available. */
  transcriptSnippet?: string;
  templateReferenceDataUrls?: string[];
  faceReferenceDataUrls?: string[];
  /** Phase 2: set internally when ffmpeg frame sampling succeeds (replaces `video_url` in VL payload). */
  sampledFrameDataUrls?: string[];
  sampledFrameCandidates?: VideoFrameSampleCandidate[];
  /** True when a video existed but raw `video_url` was intentionally omitted from VL for cost control. */
  originalVideoProvided?: boolean;
};

export type VideoUnderstandingResult = {
  analysis: ThumbnailPipelineAnalysis;
  modelUsed: string;
  frameExtractionMode?: 'direct_url' | 'yt_dlp_stream' | 'text_context_no_video_url';
  sampledFrames?: Array<{
    frameIndex: number;
    timeSec: number;
    selected?: boolean;
    source?: 'direct_url' | 'yt_dlp_stream';
  }>;
  sampledFramePreviews?: Array<{
    frameIndex: number;
    timeSec: number;
    dataUrl: string;
    source?: 'direct_url' | 'yt_dlp_stream';
  }>;
  selectedFramePreviewDataUrl?: string;
};

@Injectable()
export class PipelineVideoUnderstandingService {
  private readonly logger = new Logger(PipelineVideoUnderstandingService.name);

  constructor(
    private readonly openRouter: OpenRouterClient,
    private readonly frameSample: VideoFrameSampleService,
  ) {}

  async analyze(params: VideoUnderstandingParams): Promise<VideoUnderstandingResult> {
    const hasVideo = Boolean(params.videoUrl?.trim());
    const hasTemplateRefs = Boolean(params.templateReferenceDataUrls?.length);
    const hasFaceRefs = Boolean(params.faceReferenceDataUrls?.length);
    const hasAnyRefs = hasTemplateRefs || hasFaceRefs;

    // Text-only flow should not spend VL tokens.
    if (!hasVideo && !hasAnyRefs) {
      return {
        analysis: this.buildTextOnlyAnalysis(params.userPrompt, params.style),
        modelUsed: 'local/text-only-heuristic',
      };
    }

    if (!this.openRouter.getApiKey()) {
      throw new Error('OPENROUTER_API_KEY is not set');
    }

    let vlParams: VideoUnderstandingParams = { ...params };
    if (hasVideo && params.videoUrl?.trim()) {
      const sampled = await this.frameSample.trySampleFrameCandidates({
        videoUrl: params.videoUrl.trim(),
        durationSeconds: params.videoContext?.duration_seconds ?? null,
        logContext: 'pipeline-vl',
      });
      if (sampled.length > 0) {
        vlParams = {
          ...params,
          sampledFrameDataUrls: sampled.map((frame) => frame.dataUrl),
          sampledFrameCandidates: sampled,
        };
        this.logger.log(`Pipeline VL: vl_input_mode=frames frames=${sampled.length}`);
      } else {
        // MVP cost guardrail: do not send raw video_url to Gemini/OpenRouter when frame extraction fails.
        // Provider-side video tokens can be very expensive; text metadata is cheaper and predictable.
        vlParams = { ...params, videoUrl: undefined, originalVideoProvided: true };
        this.logger.log('Pipeline VL: vl_input_mode=text_context_no_video_url');
      }
    }

    const primary = PIPELINE_STEP_MODELS.vlPrimary;
    const fallback = PIPELINE_STEP_MODELS.vlFallback?.trim() || undefined;
    const models = fallback && fallback !== primary ? [primary, fallback] : [primary];

    let lastErr: Error | null = null;
    for (const model of models) {
      try {
        const analysis = await this.analyzeWithModel(model, vlParams);
        const selectedFramePreviewDataUrl = this.resolveSelectedFramePreview(vlParams, analysis.selectedFrameIndex);
        return {
          analysis,
          modelUsed: model,
          frameExtractionMode: this.resolveFrameExtractionMode(vlParams),
          sampledFrames: this.buildSampledFrameSummary(vlParams, analysis.selectedFrameIndex),
          sampledFramePreviews: this.buildSampledFramePreviews(vlParams),
          selectedFramePreviewDataUrl,
        };
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e));
        this.logger.warn(`Pipeline VL model=${model} failed: ${lastErr.message}`);
      }
    }

    throw lastErr ?? new Error('Video understanding failed');
  }

  private buildTextOnlyAnalysis(userPrompt: string, style?: string): ThumbnailPipelineAnalysis {
    const base = userPrompt.trim().slice(0, 500) || 'YouTube topic';
    const styleText = style?.trim() ? ` in ${style.trim()} style` : '';
    const shortSubject = base.length > 90 ? `${base.slice(0, 90)}...` : base;
    return {
      mainSubject: shortSubject,
      sceneSummary: `Text-only concept derived from creator prompt${styleText}.`,
      visualHooks: [
        'High-contrast focal subject',
        'Clear emotional expression',
        'Strong before/after or conflict cue',
      ],
      emotion: 'Curiosity and urgency',
      viewerCuriosity: 'What is the most important reveal or result behind this topic?',
      primaryHookText: 'WATCH THIS',
      hookRationale: 'The prompt does not include video evidence, so the hook should stay broad and curiosity-led.',
      textPlacement: 'Place text in the clearest empty third of the frame, away from any face or main object.',
      subjectPlacement: 'Place the main subject on the opposite third with a tight crop and readable silhouette.',
      layoutRationale: 'Use a simple two-zone layout so the viewer reads the subject and hook instantly on mobile.',
      doNotCoverRegions: ['face', 'eyes', 'mouth', 'main object', 'lower-right timestamp area'],
      bestThumbnailMoment: {
        startSec: 0,
        label: 'Text-driven key concept',
        why: 'No video was provided; use the strongest concept from prompt text.',
      },
      compositionSuggestions: [
        'Place subject on one side, text on the opposite third',
        'Keep title to 2-5 words with thick readable font',
        'Use one dominant accent color with dark/light contrast',
      ],
      thumbnailTextIdeas: ['WATCH THIS', 'YOU MISSED THIS', 'MUST SEE'],
      negativeCues: ['Tiny text', 'Cluttered background', 'Low contrast elements'],
      imageGenerationPromptSuggestions: [
        `YouTube thumbnail 16:9, bold readable text, high contrast, subject: ${shortSubject}.`,
        `Cinematic YouTube thumbnail${styleText}, expressive face, clean composition, 16:9.`,
        `Viral-style YouTube thumbnail, dramatic lighting, strong focal point, 16:9.`,
      ],
    };
  }

  private buildMessages(params: VideoUnderstandingParams, fixHint: string): OpenRouterMessage[] {
    const styleLine = params.style?.trim() ? `Preferred visual style: ${params.style.trim()}` : '';
    const system = `You are an expert YouTube thumbnail director. ${styleLine}
${ThumbnailPipelineAnalysisJsonPrompt}`;

    const templateUrls = params.templateReferenceDataUrls ?? [];
    const faceUrls = params.faceReferenceDataUrls ?? [];
    const sampled = params.sampledFrameDataUrls ?? [];
    const sampledCandidates = params.sampledFrameCandidates ?? [];
    const useFrames = sampled.length > 0;
    const hasOriginalVideo = Boolean(params.videoUrl?.trim()) || Boolean(params.originalVideoProvided);
    const frameList = sampledCandidates.length
      ? `\n\nSampled frame timeline (1-based order matching attached images):\n${sampledCandidates
          .map((frame) => `Frame ${frame.frameIndex}: ${this.formatTime(frame.timeSec)}`)
          .join('\n')}`
      : '';

    const refNote =
      templateUrls.length || faceUrls.length || useFrames
        ? useFrames
          ? '\n\nAttached images order: sampled video frames first (chronological within the analyzed window), then template reference(s) (if any), then face reference(s) (if any). Use them for likeness, layout, or palette — do not invent on-screen branding that contradicts them.'
          : '\n\nAttached images order: template reference(s) first (if any), then face reference(s) (if any). Use them for likeness, layout, or palette — do not invent on-screen branding that contradicts them.'
        : '';

    const videoNote = useFrames
      ? `The video is represented by ${sampled.length} quality-scored still frames from the opening analyzed window. Act as a YouTube thumbnail creative director: understand the video's promise, rank the most clickable frames/moments, set selectedFrameIndex to the best attached frame number, and explain why it is clickable.

Selection priority:
1. Prefer a clear human face with visible emotion, eye contact, or expressive reaction when present.
2. If no strong face is present, prefer the clearest action/conflict/result scene that explains the video's promise.
3. Avoid blurry transition frames, empty intro screens, dark UI-only frames, tiny subjects, and low-emotion screenshots.
4. Pick a frame that can work as the base image for an edited YouTube thumbnail, not merely a frame that describes the video.
${frameList}`
      : hasOriginalVideo
        ? 'A video URL was provided but raw video upload to the VL model is disabled for cost control. Use the creator prompt, metadata, and transcript if present. If timing is unknown, use startSec 0 and describe the best inferred thumbnail moment.'
        : 'No video is attached; infer carefully from the text prompt and any reference images. Use startSec 0 when unknown.';

    const transcriptLine = params.transcriptSnippet?.trim()
      ? `\n\nTranscript snippet (possibly truncated):\n${params.transcriptSnippet.trim()}`
      : '';

    const userText = `Analyze for YouTube thumbnail strategy and output JSON only.${refNote}\n\n${videoNote}${transcriptLine}\n\nCreator prompt:\n${params.userPrompt.trim()}${fixHint}`;

    const userContent: OpenRouterMessage['content'] = useFrames
      ? userContentTextThenReferenceImages(userText, [...sampled, ...templateUrls, ...faceUrls])
      : userContentTextVideoThenReferenceImages(userText, params.videoUrl?.trim(), [...templateUrls, ...faceUrls]);

    return [
      { role: 'system', content: system },
      { role: 'user', content: userContent },
    ];
  }

  private async analyzeWithModel(
    model: string,
    params: VideoUnderstandingParams,
  ): Promise<ThumbnailPipelineAnalysis> {
    let lastErr: Error | null = null;

    for (let attempt = 0; attempt <= MAX_JSON_RETRIES; attempt++) {
      const fixHint =
        attempt > 0
          ? '\nYour previous reply was invalid. Reply with ONLY compact valid JSON matching the schema, no prose.'
          : '';

      const messages: OpenRouterMessage[] =
        attempt === 0
          ? this.buildMessages(params, fixHint)
          : [
              ...this.buildMessages(params, ''),
              { role: 'user', content: `Fix your output.${fixHint}` },
            ];

      try {
        const result = await requestPipelineVlAnalysis(this.openRouter, {
          model,
          messages,
          temperature: attempt > 0 ? 0.1 : 0.3,
          maxTokens: VL_MAX_TOKENS,
        });

        this.logger.log(
          `Pipeline video understanding model=${model} latencyMs=${result.latencyMs} approxTextChars=${approximateOpenRouterMessagesPayloadChars(messages)}`,
        );

        const extracted = extractJsonObject(result.rawText);
        const parsed = JSON.parse(extracted) as unknown;
        const validated = ThumbnailPipelineAnalysisSchema.safeParse(parsed);
        if (validated.success) {
          return validated.data;
        }
        lastErr = new Error(validated.error.message);
        this.logger.warn(`Pipeline analysis JSON schema fail (attempt ${attempt + 1}): ${lastErr.message}`);
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e));
        this.logger.warn(`Pipeline analysis attempt ${attempt + 1} failed: ${lastErr.message}`);
      }
    }

    throw lastErr ?? new Error('Pipeline video understanding failed');
  }

  private resolveSelectedFramePreview(
    params: VideoUnderstandingParams,
    selectedFrameIndex: number | undefined,
  ): string | undefined {
    if (!selectedFrameIndex) return undefined;
    return params.sampledFrameCandidates?.find((frame) => frame.frameIndex === selectedFrameIndex)?.dataUrl;
  }

  private buildSampledFrameSummary(
    params: VideoUnderstandingParams,
    selectedFrameIndex: number | undefined,
  ): Array<{
    frameIndex: number;
    timeSec: number;
    selected?: boolean;
    source?: 'direct_url' | 'yt_dlp_stream';
  }> | undefined {
    const frames = params.sampledFrameCandidates;
    if (!frames?.length) return undefined;
    return frames.map((frame) => ({
      frameIndex: frame.frameIndex,
      timeSec: frame.timeSec,
      selected: selectedFrameIndex === frame.frameIndex || undefined,
      source: frame.source,
    }));
  }

  private buildSampledFramePreviews(
    params: VideoUnderstandingParams,
  ): Array<{
    frameIndex: number;
    timeSec: number;
    dataUrl: string;
    source?: 'direct_url' | 'yt_dlp_stream';
  }> | undefined {
    const frames = params.sampledFrameCandidates;
    if (!frames?.length) return undefined;
    return frames.map((frame) => ({
      frameIndex: frame.frameIndex,
      timeSec: frame.timeSec,
      dataUrl: frame.dataUrl,
      source: frame.source,
    }));
  }

  private resolveFrameExtractionMode(
    params: VideoUnderstandingParams,
  ): 'direct_url' | 'yt_dlp_stream' | 'text_context_no_video_url' | undefined {
    const frameSource = params.sampledFrameCandidates?.find((frame) => frame.source)?.source;
    if (frameSource) return frameSource;
    if (params.originalVideoProvided) return 'text_context_no_video_url';
    return undefined;
  }

  private formatTime(totalSec: number): string {
    const s = Math.max(0, Math.round(totalSec));
    const m = Math.floor(s / 60);
    const rest = s % 60;
    return `${m}:${String(rest).padStart(2, '0')}`;
  }
}
