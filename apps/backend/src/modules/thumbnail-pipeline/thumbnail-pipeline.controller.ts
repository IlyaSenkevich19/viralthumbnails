import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiControllerPaths } from '../../common/constants/api-controller-paths';
import { THROTTLE_VIDEO_FROM } from '../../common/throttle/throttle-limits';
import { UserIdThrottlerGuard } from '../../common/throttle/user-id-throttler.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseGuard } from '../auth/guards/supabase.guard';
import { ThumbnailPipelineRunDto } from './dto/thumbnail-pipeline-run.dto';
import { ThumbnailPipelineOrchestratorService } from './services/thumbnail-pipeline-orchestrator.service';

/**
 * Modular OpenRouter thumbnail pipeline (MVP). Does not debit credits yet —
 * wire {@link BillingService} before exposing broadly to end users.
 */
@ApiTags('thumbnails')
@ApiBearerAuth()
@Controller(ApiControllerPaths.thumbnails)
@UseGuards(SupabaseGuard)
export class ThumbnailPipelineController {
  constructor(private readonly orchestrator: ThumbnailPipelineOrchestratorService) {}

  @Post('pipeline/run')
  @UseGuards(UserIdThrottlerGuard)
  @Throttle({ default: { ...THROTTLE_VIDEO_FROM } })
  async runPipeline(@CurrentUser() _userId: string, @Body() body: ThumbnailPipelineRunDto) {
    const result = await this.orchestrator.run({
      userPrompt: body.user_prompt,
      style: body.style,
      videoUrl: body.video_url,
      templateReferenceDataUrls: body.template_reference_data_urls,
      faceReferenceDataUrls: body.face_reference_data_urls,
      variantCount: body.variant_count,
      generateImages: Boolean(body.generate_images),
      prioritizeFace: Boolean(body.prioritize_face),
      baseImageDataUrl: body.base_image_data_url,
      editInstruction: body.edit_instruction,
    });

    return {
      analysis: result.analysis,
      image_prompts_used: result.imagePromptsUsed,
      models_used: result.modelsUsed,
      variants: result.variants?.map((v) => ({
        index: v.index,
        prompt: v.prompt,
        content_type: v.contentType,
        image_base64: v.buffer.toString('base64'),
      })),
      edited: result.edited
        ? {
            content_type: result.edited.contentType,
            image_base64: result.edited.buffer.toString('base64'),
          }
        : undefined,
    };
  }
}
