/**
 * Nest `@Controller()` path segments (global prefix `api` is set in main.ts).
 */
export const ApiControllerPaths = {
  auth: 'auth',
  health: 'health',
  projects: 'projects',
  templates: 'templates',
  avatars: 'avatars',
  billing: 'billing',
} as const;
