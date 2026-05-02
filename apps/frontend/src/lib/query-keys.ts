/** Stable query key factories for TanStack Query */

export const queryKeys = {
  health: () => ['health'] as const,
  healthSetup: () => ['health', 'setup'] as const,

  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    /** Prefix for all paginated list queries for this user (invalidate after mutations). */
    listsForUser: (userId: string) => [...queryKeys.projects.lists(), userId] as const,
    list: (userId: string, page: number, limit: number, q: string) =>
      [...queryKeys.projects.listsForUser(userId), page, limit, q] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (userId: string, projectId: string) =>
      [...queryKeys.projects.details(), userId, projectId] as const,
  },

  templates: {
    all: ['templates'] as const,
    niches: () => [...queryKeys.templates.all, 'niches'] as const,
    list: (userId: string, niche: string, page: number, limit: number) =>
      [...queryKeys.templates.all, 'list', userId, niche, page, limit] as const,
  },

  avatars: {
    all: ['avatars'] as const,
    list: (userId: string) => [...queryKeys.avatars.all, 'list', userId] as const,
  },

  billing: {
    all: ['billing'] as const,
    credits: (userId: string) => [...queryKeys.billing.all, 'credits', userId] as const,
    creditsLedger: (userId: string) => [...queryKeys.billing.all, 'credits-ledger', userId] as const,
  },

  auth: {
    adminStatus: (userId: string | undefined) =>
      ['auth', 'admin-status', userId ?? 'anon'] as const,
  },

  youtube: {
    all: ['youtube'] as const,
    inspiration: (
      niche: string,
      perNiche: number,
      videoDuration: string,
      publishedAfter: string,
    ) =>
      [...queryKeys.youtube.all, 'inspiration', niche, perNiche, videoDuration, publishedAfter] as const,
  },
} as const;
