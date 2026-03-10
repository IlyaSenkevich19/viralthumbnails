import { createClient } from '@/lib/supabase/client';
import type { Lead } from '@/lib/types/lead';

export interface LeadsListParams {
  campaignId?: number;
  campaignIds?: number[];
  limit?: number;
}

function normalizeLead(row: Record<string, unknown>): Lead {
  return {
    id: Number(row.id),
    campaign_id: Number(row.campaign_id),
    post_id: String(row.post_id ?? ''),
    subreddit: row.subreddit != null ? String(row.subreddit) : '',
    username: row.username != null ? String(row.username) : '',
    title: String(row.title ?? ''),
    content: row.content != null ? String(row.content) : undefined,
    score: Number(row.score ?? 0),
    post_url: String(row.post_url ?? ''),
    created_at: row.created_at != null ? String(row.created_at) : undefined,
  };
}

export async function listLeads(params?: LeadsListParams): Promise<Lead[]> {
  const client = createClient();
  let query = client
    .from('leads')
    .select('id, campaign_id, post_id, subreddit, username, title, content, score, post_url, created_at')
    .order('created_at', { ascending: false });

  if (params?.campaignId != null) {
    query = query.eq('campaign_id', params.campaignId);
  } else if (params?.campaignIds != null && params.campaignIds.length > 0) {
    query = query.in('campaign_id', params.campaignIds);
  }

  const limit = params?.limit ?? 50;
  const { data, error } = await query.limit(limit);
  if (error) throw error;
  const rows = (data ?? []) as Record<string, unknown>[];
  return rows.map(normalizeLead);
}

