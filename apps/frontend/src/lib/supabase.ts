import { createClient } from '@/lib/supabase/client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export const supabase = {
  campaigns: {
    list: async () => {
      const client = createClient();
      const { data, error } = await client
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    create: async (row: {
      name: string;
      keywords: string[];
      subreddits: string[];
      score_threshold?: number;
    }) => {
      const client = createClient();
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await client
        .from('campaigns')
        .insert({
          user_id: user.id,
          name: row.name,
          keywords: row.keywords,
          subreddits: row.subreddits,
          score_threshold: row.score_threshold ?? 80,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  },
  leads: {
    list: async (params?: { campaignId?: number; limit?: number }) => {
      const client = createClient();
      let query = client
        .from('leads')
        .select(`
          id, campaign_id, post_id, subreddit, username, title, content, score, post_url, created_at
        `)
        .order('created_at', { ascending: false });
      if (params?.campaignId) {
        query = query.eq('campaign_id', params.campaignId);
      }
      const limit = params?.limit ?? 50;
      const { data, error } = await query.limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  },
};

async function fetchNestApi(
  path: string,
  options: RequestInit & { token?: string } = {},
) {
  const { token, ...init } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `API error ${res.status}`);
  }
  return res.json();
}

export const nestApi = {
  reddit: {
    scanNow: () => fetchNestApi('/api/reddit/scan-now', { method: 'POST' }),
  },
  ai: {
    scoreLead: (token: string, leadId: number) =>
      fetchNestApi('/api/ai/score-lead', {
        method: 'POST',
        body: JSON.stringify({ leadId }),
        token,
      }),
    generateReplyLead: (token: string, leadId: number) =>
      fetchNestApi('/api/ai/generate-reply-lead', {
        method: 'POST',
        body: JSON.stringify({ leadId }),
        token,
      }),
  },
  jobs: {
    status: () => fetchNestApi('/api/jobs/status'),
  },
};
