'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { avatarsApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useAvatarsList() {
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: queryKeys.avatars.list(userId ?? '__pending__'),
    queryFn: () => avatarsApi.listAvatars(accessToken!),
    enabled: !authLoading && Boolean(userId && accessToken),
  });
}

export function useCreateAvatarMutation() {
  const queryClient = useQueryClient();
  const { user, accessToken } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: (body: { name?: string; imageBase64: string; mimeType?: string }) =>
      avatarsApi.createAvatar(accessToken!, body),
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.avatars.list(userId) });
      }
    },
  });
}

export function useDeleteAvatarMutation() {
  const queryClient = useQueryClient();
  const { user, accessToken } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: (id: string) => avatarsApi.deleteAvatar(accessToken!, id),
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.avatars.list(userId) });
      }
    },
  });
}
