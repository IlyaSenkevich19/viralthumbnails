import { TEMPLATE_NICHE_CODE_LIST } from '../constants/template-niches';

/**
 * Derives niche from Storage path when the DB column is empty.
 *
 * - Root catalog (Supabase UI): `<niche>/image.png` (e.g. cooking/thumb_2.jpg)
 * - Legacy system folder: `system/<niche>/image.png`
 * - User uploads: `{userId}/<niche>/slug.png`
 */
export function inferNicheFromTemplatePath(storagePath: string): string | null {
  const segments = storagePath.split('/').filter((s) => s.length > 0);
  if (segments.length < 2) return null;

  if (segments[0] === 'system') {
    const code = segments[1];
    return TEMPLATE_NICHE_CODE_LIST.includes(code) ? code : null;
  }

  if (TEMPLATE_NICHE_CODE_LIST.includes(segments[0])) {
    return segments[0];
  }

  if (segments.length >= 3 && TEMPLATE_NICHE_CODE_LIST.includes(segments[1])) {
    return segments[1];
  }

  return null;
}

export function resolveTemplateNiche(
  dbNiche: string | null | undefined,
  storagePath: string,
): string | null {
  if (typeof dbNiche === 'string' && dbNiche.length > 0) return dbNiche;
  return inferNicheFromTemplatePath(storagePath);
}
