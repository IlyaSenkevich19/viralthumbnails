/**
 * Nest API paths relative to the backend `/api` prefix.
 * Pass these to {@link fetchJson} (it prepends `/api`).
 * For `fetch` in the browser, use {@link browserApiPath}.
 */
export const ApiRoutes = {
  health: '/health',
  healthSetup: '/health/setup',
  auth: {
    me: '/auth/me',
    leadQualification: '/auth/lead-qualification',
  },
  leads: {
    intake: '/leads/intake',
  },
  support: {
    contact: '/support/contact',
  },
  billing: {
    credits: '/billing/credits',
    startTrial: '/billing/credits/start-trial',
    creditsLedger: '/billing/credits/ledger',
  },
  templates: {
    root: '/templates',
    niches: '/templates/niches',
  },
  avatars: {
    root: '/avatars',
    one: (id: string) => `/avatars/${id}`,
  },
  projects: {
    root: '/projects',
    one: (id: string) => `/projects/${id}`,
    generate: (projectId: string) => `/projects/${projectId}/generate`,
    delete: (projectId: string) => `/projects/${projectId}`,
    variant: (projectId: string, variantId: string) =>
      `/projects/${projectId}/variants/${variantId}`,
    refineVariant: (projectId: string, variantId: string) =>
      `/projects/${projectId}/variants/${variantId}/refine`,
  },
  thumbnails: {
    pipelineRun: '/thumbnails/pipeline/run',
    pipelineRunVideo: '/thumbnails/pipeline/run-video',
    prepareVideoSource: '/thumbnails/pipeline/prepare-video-source',
    pipelineJobCreate: '/thumbnails/pipeline/jobs',
    pipelineJobOne: (jobId: string) => `/thumbnails/pipeline/jobs/${jobId}`,
    parseUrl: '/thumbnails/parse-url',
    getVideoMeta: '/thumbnails/get-video-meta',
  },
} as const;

export function templatesListPath(queryString: string): string {
  return queryString ? `${ApiRoutes.templates.root}?${queryString}` : ApiRoutes.templates.root;
}

/** Full path for browser `fetch` to the Next rewrite (`/api/...` → backend). */
export function browserApiPath(apiPath: string): string {
  const p = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  return `/api${p}`;
}
