import type { ProjectStatus, VariantStatus } from '@/lib/types/project';

/** User-visible status copy (badges, aria). */
export function projectStatusLabel(status: ProjectStatus | VariantStatus): string {
  switch (status) {
    case 'done':
      return 'Done';
    case 'generating':
      return 'Generating…';
    case 'pending':
      return 'Pending';
    case 'failed':
      return 'Failed';
    case 'draft':
      return 'Draft';
    default:
      return status;
  }
}

export function statusToneClass(status: ProjectStatus | VariantStatus): string {
  switch (status) {
    case 'done':
      return 'border-emerald-500/30 bg-emerald-500/12 text-emerald-300';
    case 'generating':
    case 'pending':
      return 'border-amber-500/30 bg-amber-500/12 text-amber-200';
    case 'failed':
      return 'border-destructive/40 bg-destructive/15 text-destructive';
    default:
      return 'border-border bg-secondary text-muted-foreground';
  }
}
