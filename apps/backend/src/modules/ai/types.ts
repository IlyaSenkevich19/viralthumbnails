export interface ScoringResponse {
  score: number;
  reason?: string;
}

export interface PostInput {
  title: string;
  content: string;
}
