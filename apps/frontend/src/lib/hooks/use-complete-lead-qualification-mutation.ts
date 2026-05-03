'use client';

import { useMutation } from '@tanstack/react-query';
import { completeLeadQualification, type CompleteLeadQualificationPayload } from '@/lib/api/auth-bootstrap';

export function useCompleteLeadQualificationMutation(accessToken: string | null) {
  return useMutation({
    mutationFn: (body: CompleteLeadQualificationPayload) => {
      if (!accessToken) throw new Error('Not signed in');
      return completeLeadQualification(accessToken, body);
    },
  });
}
