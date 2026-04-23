/**
 * Next.js application paths (no trailing slash).
 * Use for Link, router, middleware, and OAuth/reset redirect URL builders.
 */
export const AppRoutes = {
  home: '/',
  create: '/create',
  /** Legacy URL; middleware + page redirect to create. */
  dashboard: '/dashboard',
  projects: '/projects',
  /** Legacy URL; root middleware redirects to create. */
  projectsNew: '/projects/new',
  templates: '/templates',
  /** YouTube inspiration (admin-only; env `ADMIN_USER_IDS`). */
  adminYoutubeInspiration: '/admin/youtube-inspiration',
  avatars: '/avatars',
  settings: '/settings',
  credits: '/credits',
  auth: {
    register: '/auth/register',
    forgotPassword: '/auth/forgot-password',
    updatePassword: '/auth/update-password',
  },
} as const;

export function projectVariantsPath(projectId: string): string {
  return `${AppRoutes.projects}/${projectId}/variants`;
}

/** Query string for variants workspace (template / face preselection). */
export function projectVariantsSearchParams(options: {
  templateId?: string;
  avatarId?: string;
}): string {
  const q = new URLSearchParams();
  if (options.templateId) q.set('template_id', options.templateId);
  if (options.avatarId) q.set('avatar_id', options.avatarId);
  const s = q.toString();
  return s ? `?${s}` : '';
}

/**
 * Paths where an anonymous session is allowed (no redirect to home).
 * Keep in sync with auth pages that must work while logged out.
 */
export function isSessionPublicPath(pathname: string): boolean {
  return (
    pathname === AppRoutes.home ||
    pathname.startsWith(AppRoutes.auth.register)
  );
}
