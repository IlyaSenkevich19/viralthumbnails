export type ProjectVariantsRefineControls = {
  applyPending: boolean;
  creditsBalance: number | null | undefined;
  templateId: string | null;
  avatarId: string | null;
  onApply: (instruction: string) => void;
};
