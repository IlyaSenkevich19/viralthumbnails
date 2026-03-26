import type { Tab } from './types';

export function tabFromSearchParams(searchParams: URLSearchParams): Tab {
  const t = searchParams.get('tab');
  if (t === 'video' || t === 'script' || t === 'text') return t;
  return 'youtube';
}
