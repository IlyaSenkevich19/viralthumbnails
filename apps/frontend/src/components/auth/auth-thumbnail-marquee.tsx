'use client';

import { cn } from '@/lib/utils';

type ThumbItem = {
  title: string;
  toneClass: string;
};

const rowA: ThumbItem[] = [
  { title: 'How to Go Viral', toneClass: 'from-rose-500/35 via-orange-400/25 to-yellow-300/20' },
  { title: 'Top 5 Mistakes', toneClass: 'from-indigo-500/35 via-sky-400/25 to-cyan-300/20' },
  { title: 'Do This Instead', toneClass: 'from-fuchsia-500/35 via-violet-400/25 to-pink-300/20' },
  { title: '3X CTR Formula', toneClass: 'from-amber-500/35 via-red-400/25 to-rose-300/20' },
  { title: 'Before vs After', toneClass: 'from-emerald-500/30 via-teal-400/24 to-cyan-300/18' },
];

const rowB: ThumbItem[] = [
  { title: 'Stop Scrolling', toneClass: 'from-sky-500/35 via-blue-400/25 to-indigo-300/20' },
  { title: 'Secret Revealed', toneClass: 'from-rose-500/35 via-pink-400/25 to-fuchsia-300/20' },
  { title: 'Thumbnail Audit', toneClass: 'from-violet-500/35 via-purple-400/25 to-indigo-300/20' },
  { title: 'Fix This Today', toneClass: 'from-orange-500/35 via-amber-400/25 to-yellow-300/18' },
  { title: 'CTR Boost', toneClass: 'from-cyan-500/35 via-sky-400/25 to-blue-300/20' },
];

function Row({
  items,
  direction,
}: {
  items: ThumbItem[];
  direction: 'left' | 'right';
}) {
  const doubled = [...items, ...items];
  return (
    <div className="flex overflow-hidden">
      <div
        className={cn(
          'vt-auth-marquee-track flex shrink-0 gap-4',
          direction === 'left' ? 'vt-auth-marquee-left' : 'vt-auth-marquee-right',
        )}
      >
        {doubled.map((item, i) => (
          <article
            key={`${item.title}-${i}`}
            className={cn(
              'relative h-[112px] w-[200px] shrink-0 overflow-hidden rounded-xl border border-white/10',
              'bg-gradient-to-br',
              item.toneClass,
            )}
          >
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,.52),rgba(0,0,0,.12)_48%,transparent)]" />
            <div className="absolute inset-x-0 bottom-0 p-3">
              <p className="line-clamp-2 text-[13px] font-semibold tracking-tight text-white">{item.title}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function AuthThumbnailMarquee() {
  return (
    <div className="pointer-events-none relative z-[1] overflow-hidden" aria-hidden="true">
      <div className="absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-card to-transparent" />
      <div className="absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-card to-transparent" />
      <div className="flex flex-col gap-4 opacity-85">
        <Row items={rowA} direction="left" />
        <Row items={rowB} direction="right" />
      </div>
    </div>
  );
}

