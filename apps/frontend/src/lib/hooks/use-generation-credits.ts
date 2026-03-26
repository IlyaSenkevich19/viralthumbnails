'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { DEFAULT_TRIAL_GENERATION_CREDITS } from '@/config/credits';
import { createClient } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query-keys';

export type GenerationCredits = {
  balance: number;
  quota: number;
};

export function useGenerationCredits() {
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: queryKeys.billing.credits(userId ?? '__pending__'),
    queryFn: async (): Promise<GenerationCredits> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('generation_credits_balance, generation_credits_quota')
        .eq('id', userId!)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return {
          balance: DEFAULT_TRIAL_GENERATION_CREDITS,
          quota: DEFAULT_TRIAL_GENERATION_CREDITS,
        };
      }

      return {
        balance: data.generation_credits_balance,
        quota: data.generation_credits_quota,
      };
    },
    enabled: !authLoading && Boolean(userId),
  });
}
