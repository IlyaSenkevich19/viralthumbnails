'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { templatesApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useTemplatesList() {
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: queryKeys.templates.list(userId ?? '__pending__'),
    queryFn: () => templatesApi.listTemplates(accessToken!),
    enabled: !authLoading && Boolean(userId && accessToken),
  });
}
