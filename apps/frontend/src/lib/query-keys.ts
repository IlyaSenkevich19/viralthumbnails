/** Stable query key factories for TanStack Query */

export const queryKeys = {
  health: () => ['health'] as const,

  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (userId: string) => [...queryKeys.projects.lists(), userId] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (userId: string, projectId: string) =>
      [...queryKeys.projects.details(), userId, projectId] as const,
  },

  templates: {
    all: ['templates'] as const,
    niches: () => [...queryKeys.templates.all, 'niches'] as const,
    list: (userId: string, niche: string) =>
      [...queryKeys.templates.all, 'list', userId, niche] as const,
  },

  avatars: {
    all: ['avatars'] as const,
    list: (userId: string) => [...queryKeys.avatars.all, 'list', userId] as const,
  },

  billing: {
    all: ['billing'] as const,
    credits: (userId: string) => [...queryKeys.billing.all, 'credits', userId] as const,
  },
} as const;
