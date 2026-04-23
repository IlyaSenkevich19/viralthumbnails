const MAX_TITLE_LEN = 200;

function firstMeaningfulLine(raw: string): string {
  const line = raw.trim().split(/\r?\n/)[0]?.trim() ?? '';
  return line.replace(/\s+/g, ' ').trim();
}

function clampTitle(s: string): string {
  if (!s) return '';
  if (s.length <= MAX_TITLE_LEN) return s;
  return `${s.slice(0, MAX_TITLE_LEN - 1).trimEnd()}…`;
}

/**
 * Resolves `projects.title` when the client omits it — from prompt text, file name, or embedded metadata.
 */
export function inferProjectTitle(params: {
  explicitTitle?: string | null | undefined;
  sourceData: Record<string, unknown>;
}): string {
  const explicit = params.explicitTitle?.trim();
  if (explicit) return clampTitle(explicit);

  const sd = params.sourceData;

  const text = typeof sd.text === 'string' ? firstMeaningfulLine(sd.text) : '';
  if (text) return clampTitle(text);

  const userPrompt = typeof sd.user_prompt === 'string' ? firstMeaningfulLine(sd.user_prompt) : '';
  if (userPrompt) return clampTitle(userPrompt);

  const topTitle = typeof sd.title === 'string' ? firstMeaningfulLine(sd.title) : '';
  if (topTitle) return clampTitle(topTitle);

  const videoMeta = sd.video_meta;
  if (videoMeta && typeof videoMeta === 'object') {
    const metaTitle = (videoMeta as Record<string, unknown>).title;
    if (typeof metaTitle === 'string' && metaTitle.trim()) {
      return clampTitle(firstMeaningfulLine(metaTitle));
    }
  }

  const fileName = typeof sd.file_name === 'string' ? sd.file_name.trim() : '';
  if (fileName) {
    const base = fileName.replace(/\.[^.]+$/i, '').trim();
    if (base) return clampTitle(firstMeaningfulLine(base));
  }

  return 'Untitled project';
}
