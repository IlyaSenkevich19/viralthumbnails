-- Reddit LeadGen: Campaigns + Leads with RLS
-- Run in Supabase Dashboard → SQL Editor

-- Campaigns (user_id references auth.users)
CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  subreddits TEXT[] DEFAULT '{}',
  score_threshold INT DEFAULT 80,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads (from Reddit scanner)
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  campaign_id INT REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  post_id TEXT NOT NULL,
  subreddit TEXT,
  username TEXT,
  title TEXT,
  content TEXT,
  score DECIMAL(5,2) DEFAULT 0,
  post_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT leads_campaign_post_unique UNIQUE(campaign_id, post_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);

-- RLS: Campaigns
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User owns campaigns" ON campaigns;
CREATE POLICY "User owns campaigns" ON campaigns
  FOR ALL USING (auth.uid() = user_id);

-- RLS: Leads (user sees only leads from their campaigns)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User sees campaign leads" ON leads;
CREATE POLICY "User sees campaign leads" ON leads
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = campaign_id AND campaigns.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "User updates own leads" ON leads;
CREATE POLICY "User updates own leads" ON leads
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = campaign_id AND campaigns.user_id = auth.uid())
  );
