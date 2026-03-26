/** Allowed template niches — keep in sync with product / admin seed data. */
export const TEMPLATE_NICHES = [
  { code: 'cooking', label: 'Cooking' },
  { code: 'gaming', label: 'Gaming' },
  { code: 'tech', label: 'Tech' },
  { code: 'vlog', label: 'Vlog' },
  { code: 'business', label: 'Business' },
] as const;

export type TemplateNicheCode = (typeof TEMPLATE_NICHES)[number]['code'];

export const TEMPLATE_NICHE_CODE_LIST: string[] = TEMPLATE_NICHES.map((n) => n.code);
