import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import type {
  ThumbnailPipelineJobPayload,
  ThumbnailPipelineJobProgress,
  ThumbnailPipelineJobRow,
  ThumbnailPipelineJobStatus,
  ThumbnailPipelineStageTiming,
} from '../types/thumbnail-pipeline-job.types';

const RUNNING_LEASE_EXTENSION_MS = 15 * 60 * 1000;

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
        progress_payload: {
          stage: 'queued',
          label: 'Queued',
        } satisfies ThumbnailPipelineJobProgress,
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
    const progress = await this.buildTimedProgress(jobId, {
      stage: 'completed',
      label: 'Completed',
      percent: 100,
    });
    await this.patchJob(jobId, 'succeeded', {
      result_payload: resultPayload,
      error_payload: null,
      progress_payload: progress,
      finished_at: new Date().toISOString(),
      lease_expires_at: null,
    });
  }

  async markFailed(jobId: string, errorPayload: { code?: string; message: string }): Promise<void> {
    const progress = await this.buildTimedProgress(jobId, {
      stage: 'failed',
      label: errorPayload.message,
    });
    await this.patchJob(jobId, 'failed', {
      error_payload: errorPayload,
      progress_payload: progress,
      finished_at: new Date().toISOString(),
      lease_expires_at: null,
    });
  }

  async requeue(jobId: string, errorPayload: { code?: string; message: string }): Promise<void> {
    const client = this.supabase.getAdminClient();
    const { error } = await client
      .from(this.table)
      .update({
        status: 'queued',
        updated_at: new Date().toISOString(),
        error_payload: errorPayload,
        progress_payload: {
          stage: 'queued',
          label: 'Queued for retry',
        } satisfies ThumbnailPipelineJobProgress,
        lease_expires_at: null,
      })
      .eq('id', jobId);
    if (error) {
      throw new Error(`Failed to requeue pipeline job: ${error.message}`);
    }
  }

  async failExpiredRunningJobs(): Promise<number> {
    const client = this.supabase.getAdminClient();
    const nowIso = new Date().toISOString();
    const { data: expiredRows, error: readError } = await client
      .from(this.table)
      .select('id,user_id,request_payload')
      .eq('status', 'running')
      .lt('lease_expires_at', nowIso);
    if (readError) {
      throw new Error(`Failed to read expired running jobs: ${readError.message}`);
    }
    const expired = (expiredRows as Pick<ThumbnailPipelineJobRow, 'id' | 'user_id' | 'request_payload'>[] | null) ?? [];
    if (expired.length === 0) return 0;

    const { data, error } = await client
      .from(this.table)
      .update({
        status: 'failed',
        updated_at: nowIso,
        finished_at: nowIso,
        lease_expires_at: null,
        error_payload: { code: 'JOB_LEASE_EXPIRED', message: 'Pipeline job lease expired before completion' },
        progress_payload: {
          stage: 'failed',
          label: 'Failed (lease expired)',
        } satisfies ThumbnailPipelineJobProgress,
      })
      .eq('status', 'running')
      .lt('lease_expires_at', nowIso)
      .select('id');
    if (error) {
      throw new Error(`Failed to fail expired running jobs: ${error.message}`);
    }
    await Promise.all(
      expired.map(async (job) => {
        const projectId = job.request_payload?.projectId;
        if (!projectId) return;
        try {
          await this.updateProjectPipelineState({
            userId: job.user_id,
            projectId,
            status: 'failed',
            pipelineJobId: job.id,
            progress: { stage: 'failed', label: 'Failed (lease expired)' },
            errorMessage: 'Pipeline job lease expired before completion',
          });
        } catch {
          // Best-effort: job status is already failed; project state will self-heal on next run.
        }
      }),
    );

    return data?.length ?? expired.length;
  }

  async claimNextQueuedJob(leaseMs: number): Promise<ThumbnailPipelineJobRow | null> {
    const client = this.supabase.getAdminClient();
    const { data: queued, error: queuedError } = await client
      .from(this.table)
      .select('id,attempt_count')
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
        attempt_count: (queued.attempt_count ?? 0) + 1,
        progress_payload: {
          stage: 'resolving_references',
          label: 'Preparing inputs',
        } satisfies ThumbnailPipelineJobProgress,
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

  async updateProgress(jobId: string, progress: ThumbnailPipelineJobProgress): Promise<ThumbnailPipelineJobProgress> {
    const client = this.supabase.getAdminClient();
    const timedProgress = await this.buildTimedProgress(jobId, progress);
    const { error } = await client
      .from(this.table)
      .update({
        progress_payload: timedProgress,
        updated_at: new Date().toISOString(),
        lease_expires_at: new Date(Date.now() + RUNNING_LEASE_EXTENSION_MS).toISOString(),
      })
      .eq('id', jobId)
      .in('status', ['queued', 'running']);
    if (error) {
      throw new Error(`Failed to update pipeline job progress: ${error.message}`);
    }
    return timedProgress;
  }

  async findActiveForUser(userId: string): Promise<ThumbnailPipelineJobRow | null> {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client
      .from(this.table)
      .select('*')
      .eq('user_id', userId)
      .in('status', ['queued', 'running'])
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to read active pipeline job: ${error.message}`);
    }
    return (data as ThumbnailPipelineJobRow | null) ?? null;
  }

  async updateProjectPipelineState(params: {
    userId: string;
    projectId: string;
    status?: 'pending' | 'generating' | 'done' | 'failed';
    pipelineJobId?: string;
    progress?: ThumbnailPipelineJobProgress | null;
    errorMessage?: string | null;
    sourceDataPatch?: Record<string, unknown>;
  }): Promise<void> {
    const client = this.supabase.getAdminClient();
    const { data: existing, error: readErr } = await client
      .from('projects')
      .select('source_data')
      .eq('id', params.projectId)
      .eq('user_id', params.userId)
      .maybeSingle();
    if (readErr || !existing) {
      throw new Error(readErr?.message ?? 'Failed to read project for pipeline state update');
    }

    const nextSourceData: Record<string, unknown> = {
      ...((existing.source_data as Record<string, unknown> | null) ?? {}),
      ...(params.sourceDataPatch ?? {}),
    };
    if (params.pipelineJobId) nextSourceData.pipeline_job_id = params.pipelineJobId;
    nextSourceData.pipeline_progress = params.progress ?? null;
    nextSourceData.pipeline_error = params.errorMessage ?? null;

    const patch: Record<string, unknown> = {
      source_data: nextSourceData,
      updated_at: new Date().toISOString(),
    };
    if (params.status) patch.status = params.status;

    const { error: updateErr } = await client
      .from('projects')
      .update(patch)
      .eq('id', params.projectId)
      .eq('user_id', params.userId);
    if (updateErr) {
      throw new Error(`Failed to update pipeline-linked project: ${updateErr.message}`);
    }
  }

  private async buildTimedProgress(
    jobId: string,
    next: ThumbnailPipelineJobProgress,
  ): Promise<ThumbnailPipelineJobProgress> {
    const current = await this.readProgress(jobId);
    return this.mergeProgressTiming(current, next, new Date());
  }

  private async readProgress(jobId: string): Promise<ThumbnailPipelineJobProgress | null> {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client
      .from(this.table)
      .select('progress_payload')
      .eq('id', jobId)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to read pipeline job progress: ${error.message}`);
    }
    const raw = (data as { progress_payload?: unknown } | null)?.progress_payload;
    return raw && typeof raw === 'object' ? (raw as ThumbnailPipelineJobProgress) : null;
  }

  private mergeProgressTiming(
    current: ThumbnailPipelineJobProgress | null,
    next: ThumbnailPipelineJobProgress,
    now: Date,
  ): ThumbnailPipelineJobProgress {
    const nowIso = now.toISOString();
    const currentStageStartedAt = current?.stage_started_at ?? nowIso;
    const currentElapsedMs = Math.max(0, now.getTime() - new Date(currentStageStartedAt).getTime());
    const timings = [...(current?.timings ?? [])];

    if (!current) {
      return {
        ...next,
        stage_started_at: nowIso,
        elapsed_ms: 0,
        timings: [{ stage: next.stage, label: next.label, started_at: nowIso }],
      };
    }

    if (current.stage === next.stage) {
      return {
        ...current,
        ...next,
        stage_started_at: currentStageStartedAt,
        elapsed_ms: currentElapsedMs,
        timings: this.upsertTiming(timings, {
          stage: next.stage,
          label: next.label,
          started_at: currentStageStartedAt,
          duration_ms: currentElapsedMs,
        }),
      };
    }

    const closedCurrent: ThumbnailPipelineStageTiming = {
      stage: current.stage,
      label: current.label,
      started_at: currentStageStartedAt,
      finished_at: nowIso,
      duration_ms: currentElapsedMs,
    };
    const nextTiming: ThumbnailPipelineStageTiming = {
      stage: next.stage,
      label: next.label,
      started_at: nowIso,
      duration_ms: 0,
    };

    return {
      ...next,
      analysis: next.analysis ?? current.analysis,
      stage_started_at: nowIso,
      elapsed_ms: 0,
      timings: this.upsertTiming(this.upsertTiming(timings, closedCurrent), nextTiming),
    };
  }

  private upsertTiming(
    timings: ThumbnailPipelineStageTiming[],
    timing: ThumbnailPipelineStageTiming,
  ): ThumbnailPipelineStageTiming[] {
    let idx = -1;
    for (let i = timings.length - 1; i >= 0; i--) {
      if (timings[i]?.stage === timing.stage) {
        idx = i;
        break;
      }
    }
    if (idx === -1) return [...timings, timing];
    const next = [...timings];
    next[idx] = { ...next[idx], ...timing };
    return next;
  }
}

