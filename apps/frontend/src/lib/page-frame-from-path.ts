import { AppRoutes } from '@/config/routes';
import type { PageFrameState } from '@/contexts/page-frame-context';

/**
 * Title/eyebrow for app routes — mirrors {@link SetPageFrame} on each page so the header can render
 * on the first paint without flashing the site name.
 * When changing copy here, update the matching page’s SetPageFrame props.
 */
const STATIC_PAGE_FRAMES: Record<string, PageFrameState> = {
  [AppRoutes.create]: { title: 'Create', eyebrow: null },
  [AppRoutes.dashboard]: { title: 'Create', eyebrow: null },
  [AppRoutes.projects]: { title: 'Projects', eyebrow: null },
  [AppRoutes.templates]: { title: 'Templates', eyebrow: null },
  [AppRoutes.avatars]: { title: 'My faces', eyebrow: null },
  [AppRoutes.settings]: { title: 'Settings', eyebrow: null },
  [AppRoutes.credits]: { title: 'Credit packs', eyebrow: null },
  [AppRoutes.adminYoutubeInspiration]: {
    eyebrow: 'Admin',
    title: 'YouTube inspiration',
  },
};

const PROJECT_VARIANTS_PATH = /^\/projects\/[^/]+\/variants$/;

export function isProjectVariantsPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return PROJECT_VARIANTS_PATH.test(pathname);
}

export function resolveStaticPageFrame(pathname: string | null): PageFrameState | null {
  if (!pathname) return null;
  return STATIC_PAGE_FRAMES[pathname] ?? null;
}
