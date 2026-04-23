/**
 * Manual QA checklist — used by /qa-checklist (dev only) and documented in docs/qa-manual-test-checklist.md.
 * When you add a case here, update the doc in the same commit.
 */
export type QATestCase = {
  id: string;
  label: string;
  /** Optional: route or short hint for the tester */
  hint?: string;
};

export type QATestGroup = {
  id: string;
  title: string;
  items: QATestCase[];
};

export const QA_TEST_GROUPS: QATestGroup[] = [
  {
    id: 'auth',
    title: 'Auth & shell',
    items: [
      { id: 'auth-login', label: 'Login (email or Google) lands on /create' },
      { id: 'auth-header', label: 'Header: credits slot stable, Create CTA, no layout jump on reload' },
      { id: 'auth-sidebar', label: 'Sidebar: active state for current route' },
    ],
  },
  {
    id: 'create',
    title: 'Create (/create)',
    items: [
      { id: 'create-prompt', label: 'Prompt: empty validation; submit creates draft project and opens /projects/:id/variants' },
      { id: 'create-yt', label: 'YouTube URL: valid link starts pipeline, redirects to project, toast OK' },
      { id: 'create-yt-invalid', label: 'YouTube: invalid URL shows error, no project' },
      { id: 'create-video', label: 'Video upload: trim message if long; project + pipeline; redirect to project' },
      { id: 'create-credits', label: 'Insufficient credits: blocked with paywall/ toast as implemented' },
    ],
  },
  {
    id: 'projects',
    title: 'Projects list',
    items: [
      { id: 'projects-list', label: 'List loads; covers and titles; refresh behaves' },
      { id: 'projects-new', label: 'New project (if any) goes to /create or empty project flow as designed' },
    ],
  },
  {
    id: 'variants',
    title: 'Project detail (/projects/:id/variants)',
    items: [
      { id: 'var-header', label: 'Header: long project title is truncated; hover shows full title' },
      { id: 'var-source', label: 'Source card shows for video/YT: URL or file name + pipeline status when job exists' },
      { id: 'var-pipeline', label: 'Pipeline running: progress text; Generate disabled; completes → refetch, variants or unlock' },
      { id: 'var-templates', label: 'Template niches, face filter (all / with / faceless), grid + pagination' },
      { id: 'var-generate', label: 'Character + Prioritize: faceless omits ref and disables prioritize as expected' },
      { id: 'var-generate-btn', label: 'Generate charges credits, variants appear, errors handled' },
      { id: 'var-preview', label: 'Preview, strip selection, download link, delete confirm' },
    ],
  },
  {
    id: 'assets',
    title: 'Templates & avatars',
    items: [
      { id: 'tmpl-list', label: 'Templates page: grid, images load (optimized), niche filter' },
      { id: 'face-list', label: 'My faces: list/upload as implemented' },
    ],
  },
  {
    id: 'billing',
    title: 'Credits & billing UI',
    items: [
      { id: 'credits-page', label: '/credits: balance, history, back link' },
    ],
  },
  {
    id: 'settings',
    title: 'Settings & admin',
    items: [
      { id: 'settings-page', label: 'Settings: panels load; app connection' },
      { id: 'admin-yt', label: 'Admin YouTube inspiration: non-admin redirected; admin can open (if applicable)' },
    ],
  },
  {
    id: 'pipeline-recovery',
    title: 'Pipeline & recovery',
    items: [
      { id: 'pjob-reload', label: 'Reload during pipeline: header/ project status still reflects activity where implemented' },
      { id: 'pjob-single', label: 'Starting a second long job while one runs: error or block as per product' },
    ],
  },
];

export const QA_STORAGE_KEY = 'viralthumbs-qa-checklist-v1';
