import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AiService } from '../ai/ai.service';
import { BillingService } from '../billing/billing.service';

/**
 * Orchestrates thumbnail variant creation, AI generation, billing refunds, and project status updates.
 * Kept separate from {@link ProjectsService} to limit that service to CRUD and signing.
 */
@Injectable()
export class ProjectGenerationService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly ai: AiService,
    private readonly billing: BillingService,
  ) {}

  async generateThumbnailVariants(
    project: Record<string, unknown>,
    projectId: string,
    userId: string,
    templateId: string | undefined,
    count: number,
  ) {
    await this.billing.reserveGenerationCredits(userId, count);

    const client = this.supabase.getAdminClient();
    const now = () => new Date().toISOString();

    await client
      .from('projects')
      .update({ status: 'generating', updated_at: now() })
      .eq('id', projectId);

    const createdIds: string[] = [];

    try {
      for (let i = 0; i < count; i++) {
        const { data: row, error } = await client
          .from('thumbnail_variants')
          .insert({
            project_id: projectId,
            status: 'generating',
            template_id: templateId ?? null,
          })
          .select('id')
          .single();
        if (error || !row) {
          throw new Error(error?.message ?? 'Failed to create variant');
        }
        createdIds.push(row.id);
      }

      const results = [];
      for (const variantId of createdIds) {
        const result = await this.ai.generateThumbnailForProject({
          projectId,
          userId,
          variantId,
          templateId,
        });
        results.push(result);
      }

      const anyDone = results.some((r) => r.status === 'done');
      const firstDone = results.find((r) => r.status === 'done');

      let cover_thumbnail_storage_path: string | null =
        (project as { cover_thumbnail_storage_path?: string | null })
          .cover_thumbnail_storage_path ?? null;
      let cover_thumbnail_url: string | null =
        (project as { cover_thumbnail_url?: string | null }).cover_thumbnail_url ?? null;

      if (firstDone) {
        if (firstDone.storagePath) {
          cover_thumbnail_storage_path = firstDone.storagePath;
          cover_thumbnail_url = null;
        } else if (firstDone.imageUrl) {
          cover_thumbnail_url = firstDone.imageUrl;
          cover_thumbnail_storage_path = null;
        }
      }

      await client
        .from('projects')
        .update({
          status: anyDone ? 'done' : 'failed',
          cover_thumbnail_storage_path,
          cover_thumbnail_url,
          updated_at: now(),
        })
        .eq('id', projectId);

      const doneCount = results.filter((r) => r.status === 'done').length;
      try {
        await this.billing.refundGenerationCredits(userId, count - doneCount);
      } catch {
        /* refund is best-effort; logged inside BillingService */
      }

      return { variant_ids: createdIds, results };
    } catch (e) {
      await this.billing.refundGenerationCredits(userId, count);
      const msg = e instanceof Error ? e.message : 'Generation failed';
      if (createdIds.length > 0) {
        await client
          .from('thumbnail_variants')
          .update({ status: 'failed', error_message: msg })
          .in('id', createdIds)
          .eq('status', 'generating');
      }
      await client
        .from('projects')
        .update({ status: 'failed', updated_at: now() })
        .eq('id', projectId);
      throw new InternalServerErrorException(msg);
    }
  }
}
