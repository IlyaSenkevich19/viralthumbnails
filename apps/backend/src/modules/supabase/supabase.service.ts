import { Injectable } from '@nestjs/common';
import { getSupabaseAdmin } from '../../lib/supabase-admin';

export interface Campaign {
  id: number;
  user_id: string;
  name: string;
  keywords: string[];
  subreddits: string[];
  score_threshold: number;
  is_active: boolean;
}

@Injectable()
export class SupabaseService {
  private get client() {
    return getSupabaseAdmin();
  }

  async getActiveCampaigns(): Promise<Campaign[]> {
    const { data, error } = await this.client
      .from('campaigns')
      .select('id, user_id, name, keywords, subreddits, score_threshold, is_active')
      .eq('is_active', true);

    if (error) throw error;
    return (data ?? []).filter(
      (c) => Array.isArray(c.subreddits) && c.subreddits.length > 0 && Array.isArray(c.keywords) && c.keywords.length > 0,
    ) as Campaign[];
  }

  async insertLead(row: {
    campaign_id: number;
    post_id: string;
    subreddit: string;
    username: string;
    title: string;
    content?: string;
    score: number;
    post_url: string;
  }) {
    const { error } = await this.client.from('leads').upsert(row, {
      onConflict: 'campaign_id,post_id',
      ignoreDuplicates: true,
    });
    if (error) throw error;
  }

  async updateLeadScore(leadId: number, score: number) {
    const { error } = await this.client
      .from('leads')
      .update({ score })
      .eq('id', leadId);
    if (error) throw error;
  }

  async getLeadById(leadId: number) {
    const { data, error } = await this.client
      .from('leads')
      .select('id, campaign_id, title, content')
      .eq('id', leadId)
      .single();
    if (error) throw error;
    return data;
  }

  async getCampaignById(campaignId: number) {
    const { data, error } = await this.client
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .single();
    if (error) throw error;
    return data;
  }
}
