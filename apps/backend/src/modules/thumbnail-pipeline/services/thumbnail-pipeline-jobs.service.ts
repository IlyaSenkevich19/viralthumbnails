import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import type {
  ThumbnailPipelineJobPayload,
  ThumbnailPipelineJobRow,
  ThumbnailPipelineJobStatus,
} from '../types/thumbnail-pipeline-job.types';

@Injectable()
export class ThumbnailPipelineJobsService {
  private readonly table = 'thumbnail_pipeline_jobs';

  constructor(private readonly supabase: SupabaseService) {}

  async enqueue(params: { userId: string; payload: ThumbnailPipelineJobPayload }): Promise<ThumbnailPipelineJobRow> {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client
      .from(this.table)
      .insert({
        user_id: params.userId,
        status: 'queued',
        request_payload: params.payload,
      })
      .select('*')
      .single();
    if (error || !data) {
      throw new Error(`Failed to enqueue pipeline job: ${error?.message ?? 'unknown'}`);
    }
    return data as ThumbnailPipelineJobRow;
  }

  async getForUser(jobId: string, userId: string): Promise<ThumbnailPipelineJobRow | null> {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client
      .from(this.table)
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to read pipeline job: ${error.message}`);
    }
    return (data as ThumbnailPipelineJobRow | null) ?? null;
  }

  async markSucceeded(jobId: string, resultPayload: unknown): Promise<void> {
    await this.patchJob(jobId, 'succeeded', {
      result_payload: resultPayload,
      error_payload: null,
      finished_at: new Date().toISOString(),
      lease_expires_at: null,
    });
  }

  async markFailed(jobId: string, errorPayload: { code?: string; message: string }): Promise<void> {
    await this.patchJob(jobId, 'failed', {
      error_payload: errorPayload,
      finished_at: new Date().toISOString(),
      lease_expires_at: null,
    });
  }

  async failExpiredRunningJobs(): Promise<number> {
    const client = this.supabase.getAdminClient();
    const nowIso = new Date().toISOString();
    const { data, error } = await client
      .from(this.table)
      .update({
        status: 'failed',
        updated_at: nowIso,
        finished_at: nowIso,
        lease_expires_at: null,
        error_payload: { code: 'JOB_LEASE_EXPIRED', message: 'Pipeline job lease expired before completion' },
      })
      .eq('status', 'running')
      .lt('lease_expires_at', nowIso)
      .select('id');
    if (error) {
      throw new Error(`Failed to fail expired running jobs: ${error.message}`);
    }
    return data?.length ?? 0;
  }

  async claimNextQueuedJob(leaseMs: number): Promise<ThumbnailPipelineJobRow | null> {
    const client = this.supabase.getAdminClient();
    const { data: queued, error: queuedError } = await client
      .from(this.table)
      .select('id')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (queuedError) {
      throw new Error(`Failed to pick queued pipeline job: ${queuedError.message}`);
    }
    if (!queued?.id) return null;

    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + leaseMs).toISOString();
    const { data, error } = await client
      .from(this.table)
      .update({
        status: 'running',
        updated_at: now.toISOString(),
        started_at: now.toISOString(),
        lease_expires_at: leaseExpiresAt,
        attempt_count: 1,
      })
      .eq('id', queued.id)
      .eq('status', 'queued')
      .select('*')
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to claim queued pipeline job: ${error.message}`);
    }
    return (data as ThumbnailPipelineJobRow | null) ?? null;
  }

  private async patchJob(
    jobId: string,
    status: ThumbnailPipelineJobStatus,
    patch: Record<string, unknown>,
  ): Promise<void> {
    const client = this.supabase.getAdminClient();
    const { error } = await client
      .from(this.table)
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...patch,
      })
      .eq('id', jobId);
    if (error) {
      throw new Error(`Failed to update pipeline job: ${error.message}`);
    }
  }
}

