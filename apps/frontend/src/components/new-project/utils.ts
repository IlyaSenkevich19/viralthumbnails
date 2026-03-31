import type { Tab } from './types';

export function tabFromSearchParams(searchParams: URLSearchParams): Tab {
  const t = searchParams.get('tab');
  if (t === 'video' || t === 'script' || t === 'text' || t === 'youtube') return t;
  if (searchParams.get('prefill_text')) return 'text';
  return 'youtube';
}
