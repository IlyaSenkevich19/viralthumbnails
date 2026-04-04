/** OpenRouter / OpenAI-style chat message parts */
export type OpenRouterContentPart =
  | { type: 'text'; text: string }
  | { type: 'video_url'; video_url: { url: string } }
  | { type: 'image_url'; image_url: { url: string } };

export type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | OpenRouterContentPart[];
};

export type OpenRouterUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost?: number;
};

export type OpenRouterChatResult = {
  rawText: string;
  contentParts: unknown[];
  usage: OpenRouterUsage | null;
  model: string;
  latencyMs: number;
};

export type OpenRouterDecodedImage = { mime: string; base64: string };
