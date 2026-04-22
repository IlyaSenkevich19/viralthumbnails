import { memo } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { AppRoutes } from '@/config/routes';
import {
  SELECT_EMPTY_VALUE,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DASHBOARD_CREATE_HUB_MODE } from '../dashboard-create-hub.utils';
import type { HubMode } from '../dashboard-create-hub.utils';

type TemplateItem = { id: string; name: string };
type AvatarItem = { id: string; name?: string | null };

type Props = {
  moreOptionsOpen: boolean;
  onMoreOptionsToggle: (open: boolean) => void;
  mode: HubMode;
  assetsBusy: boolean;
  canLoadAssets: boolean;
  templates: TemplateItem[];
  avatars: AvatarItem[];
  selectedTemplateId: string;
  onTemplateIdChange: (id: string) => void;
  selectedAvatarId: string;
  onAvatarIdChange: (id: string) => void;
  videoPrioritizeFace: boolean;
  onVideoPrioritizeFaceChange: (v: boolean) => void;
};

export const MoreOptionsSection = memo(function MoreOptionsSection({
  moreOptionsOpen,
  onMoreOptionsToggle,
  mode,
  assetsBusy,
  canLoadAssets,
  templates,
  avatars,
  selectedTemplateId,
  onTemplateIdChange,
  selectedAvatarId,
  onAvatarIdChange,
  videoPrioritizeFace,
  onVideoPrioritizeFaceChange,
}: Props) {
  return (
    <details
      className="group mt-8 border-t border-border pt-2 [&_summary::-webkit-details-marker]:hidden"
      open={moreOptionsOpen}
      onToggle={(e) => onMoreOptionsToggle(e.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-2 py-3 text-left motion-base hover:bg-secondary/30">
        <span>
          <span className="text-sm font-medium text-foreground">More options</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Template & face — optional for every mode; face checkbox applies to Video
          </span>
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="space-y-4 border-t border-border/70 pt-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="dash-template" className="text-sm font-medium text-foreground">
              Template
            </label>
            <Select
              value={selectedTemplateId || SELECT_EMPTY_VALUE}
              onValueChange={(v) => onTemplateIdChange(v === SELECT_EMPTY_VALUE ? '' : v)}
              disabled={assetsBusy}
            >
              <SelectTrigger id="dash-template">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_EMPTY_VALUE}>None</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="dash-face" className="text-sm font-medium text-foreground">
              Face
            </label>
            <Select
              value={selectedAvatarId || SELECT_EMPTY_VALUE}
              onValueChange={(v) => onAvatarIdChange(v === SELECT_EMPTY_VALUE ? '' : v)}
              disabled={assetsBusy}
            >
              <SelectTrigger id="dash-face">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_EMPTY_VALUE}>None</SelectItem>
                {avatars.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name?.trim() ? a.name : a.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {mode === DASHBOARD_CREATE_HUB_MODE.video && selectedAvatarId ? (
          <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-input"
              checked={videoPrioritizeFace}
              onChange={(e) => onVideoPrioritizeFaceChange(e.target.checked)}
            />
            <span>
              <span className="font-medium">Prioritize face likeness</span>
              <span className="block text-xs text-muted-foreground">
                Stronger match to your face reference in thumbnails.
              </span>
            </span>
          </label>
        ) : null}
        <p className="text-xs text-muted-foreground">
          <Link href={AppRoutes.templates} className="underline-offset-2 hover:underline">
            All templates
          </Link>
          {' · '}
          <Link href={AppRoutes.avatars} className="underline-offset-2 hover:underline">
            My faces
          </Link>
          {!canLoadAssets ? ' · Sign in to load lists.' : null}
        </p>
      </div>
    </details>
  );
});
