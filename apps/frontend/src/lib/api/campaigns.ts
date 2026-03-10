import { createClient } from '@/lib/supabase/client';

export interface CampaignInput {
  name: string;
  keywords: string[];
  subreddits: string[];
  score_threshold?: number;
  project_id: number; // required: campaign belongs to a project (User → Projects → Campaigns → Leads)
}

export async function listCampaigns(projectId?: number | null) {
  const client = createClient();
  let query = client
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (projectId != null) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createCampaign(row: CampaignInput) {
  const client = createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await client
    .from('campaigns')
    .insert({
      user_id: user.id,
      name: row.name,
      keywords: row.keywords,
      subreddits: row.subreddits,
      score_threshold: row.score_threshold ?? 80,
      project_id: row.project_id,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

