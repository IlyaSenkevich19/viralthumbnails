'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useSignInMutation() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.signIn(email, password),
  });
}

export function useSignUpMutation() {
  return useMutation({
    mutationFn: ({
      email,
      password,
      metadata,
    }: {
      email: string;
      password: string;
      metadata?: authApi.SignUpLeadMetadata;
    }) => authApi.signUp(email, password, metadata),
  });
}

export function useSignInWithGoogleMutation() {
  return useMutation({
    mutationFn: () => authApi.signInWithGoogle(),
  });
}

export function useSignOutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.signOut(),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.projects.all });
      queryClient.removeQueries({ queryKey: queryKeys.templates.all });
      queryClient.removeQueries({ queryKey: queryKeys.avatars.all });
      queryClient.removeQueries({ queryKey: queryKeys.billing.all });
    },
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: (email: string) => authApi.resetPasswordForEmail(email),
  });
}

export function useUpdatePasswordMutation() {
  return useMutation({
    mutationFn: (newPassword: string) => authApi.updatePassword(newPassword),
  });
}
