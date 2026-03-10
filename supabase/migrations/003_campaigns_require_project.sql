-- Hierarchy: User → Projects → Campaigns → Leads
-- Make campaigns always belong to a project (project_id NOT NULL).

-- 1. Assign orphan campaigns (project_id IS NULL) to a project:
--    use first project of the same user, or insert "Default project" and use it
INSERT INTO projects (user_id, name, website, company_description, brand_variations, competitors, plan)
SELECT c.user_id, 'Default project', NULL, NULL, '[]'::jsonb, '[]'::jsonb, NULL
FROM campaigns c
WHERE c.project_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.user_id = c.user_id LIMIT 1)
GROUP BY c.user_id;

UPDATE campaigns c
SET project_id = (
  SELECT p.id FROM projects p WHERE p.user_id = c.user_id ORDER BY p.id LIMIT 1
)
WHERE c.project_id IS NULL;

-- 2. If any campaign still has NULL (no project for user), create one and retry
INSERT INTO projects (user_id, name, website, company_description, brand_variations, competitors, plan)
SELECT c.user_id, 'Default project', NULL, NULL, '[]'::jsonb, '[]'::jsonb, NULL
FROM campaigns c
WHERE c.project_id IS NULL
GROUP BY c.user_id;

UPDATE campaigns c
SET project_id = (
  SELECT p.id FROM projects p WHERE p.user_id = c.user_id ORDER BY p.id LIMIT 1
)
WHERE c.project_id IS NULL;

-- 3. Enforce NOT NULL
ALTER TABLE campaigns
  ALTER COLUMN project_id SET NOT NULL;

COMMENT ON COLUMN campaigns.project_id IS 'Campaign belongs to this project (User → Projects → Campaigns → Leads).';
