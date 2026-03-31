/**
 * Next.js application paths (no trailing slash).
 * Use for Link, router, middleware, and OAuth/reset redirect URL builders.
 */
export const AppRoutes = {
  home: '/',
  dashboard: '/dashboard',
  projects: '/projects',
  /** Legacy URL; root middleware redirects to dashboard with {@link AppSearchParams.openNewProject}. */
  projectsNew: '/projects/new',
  templates: '/templates',
  /** YouTube inspiration (admin-only; env `ADMIN_USER_IDS`). */
  adminYoutubeInspiration: '/admin/youtube-inspiration',
  avatars: '/avatars',
  abTests: '/ab-tests',
  settings: '/settings',
  credits: '/credits',
  auth: {
    register: '/auth/register',
    forgotPassword: '/auth/forgot-password',
    updatePassword: '/auth/update-password',
  },
} as const;

/** Query keys used with app navigation. */
export const AppSearchParams = {
  openNewProject: 'openNewProject',
} as const;

export function projectVariantsPath(projectId: string): string {
  return `${AppRoutes.projects}/${projectId}/variants`;
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
