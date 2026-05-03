'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LeadCustomSelect } from '@/components/ui/lead-custom-select';
import { collectLeadAttribution } from '@/lib/lead-attribution';
import {
  LEAD_PROBLEM_OPTIONS,
  LEAD_SUBSCRIBER_OPTIONS,
  LEAD_VIDEOS_PER_WEEK_OPTIONS,
} from '@/lib/lead-qualification-config';
import { getOrCreateLeadSessionId } from '@/lib/lead-session-id';
import { useCompleteLeadQualificationMutation } from '@/lib/hooks/use-complete-lead-qualification-mutation';
import { authFormInputClassName } from '@/components/auth/auth-split-layout';
import { isLikelyYoutubeUrl, normalizeHttpUrl } from '@/lib/youtube-channel-url';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/lib/use-focus-trap';
import { vtSpring } from '@/lib/motion-presets';
import { trackEvent } from '@/lib/analytics';
import { isApiError } from '@/lib/api/api-error';

const STEPS = 4 as const;

type LeadQualificationModalProps = {
  accessToken: string;
  onCompleted: () => Promise<void>;
};

export function LeadQualificationModal({ accessToken, onCompleted }: LeadQualificationModalProps) {
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, dialogRef);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [biggestProblem, setBiggestProblem] = useState('');
  const [subscriberCount, setSubscriberCount] = useState('');
  const [videosPerWeek, setVideosPerWeek] = useState('');
  const [channelUrl, setChannelUrl] = useState('');
  const [channelError, setChannelError] = useState('');

  const mutation = useCompleteLeadQualificationMutation(accessToken);

  useEffect(() => {
    trackEvent('lead_qualification_modal_opened', {});
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function nextFromStep3() {
    trackEvent('lead_qualification_step', { from_step: 3, to_step: 4 });
    setStep(4);
  }

  async function submitFinal() {
    const normalized = normalizeHttpUrl(channelUrl);
    if (!isLikelyYoutubeUrl(normalized)) {
      setChannelError('Paste a valid YouTube link (channel, @handle, or video URL).');
      return;
    }
    setChannelError('');
    const attribution = collectLeadAttribution({ source: 'app_lead_qualification' });
    const payload = {
      lead_session_id: getOrCreateLeadSessionId(),
      channel_url: normalized.trim(),
      biggest_thumbnail_problem: biggestProblem || undefined,
      subscriber_count: subscriberCount || undefined,
      videos_per_week: videosPerWeek || undefined,
      page_path: typeof window !== 'undefined' ? window.location.pathname : '/create',
      ...attribution,
    };

    try {
      const res = await mutation.mutateAsync(payload);
      trackEvent('lead_qualification_completed', {
        crm_skipped: Boolean(res.crmSkipped),
        has_channel: true,
        biggest_thumbnail_problem: biggestProblem || undefined,
        subscriber_count: subscriberCount || undefined,
        videos_per_week: videosPerWeek || undefined,
      });
      if (res.crmSkipped) {
        toast.message('Profile saved. CRM webhook is not configured on the server.');
      }
      await onCompleted();
    } catch (err) {
      trackEvent('lead_qualification_submit_failed', {
        status: isApiError(err) ? err.statusCode : undefined,
      });
      const message =
        err instanceof Error ? err.message : 'Could not save your answers. Please try again.';
      toast.error(message);
    }
  }

  const progress = (step / STEPS) * 100;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="surface max-h-[min(90dvh,44rem)] w-full max-w-lg overflow-y-auto p-6 shadow-xl"
      >
        <h2 id={titleId} className="text-xl font-semibold tracking-tight text-foreground">
          Quick setup
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Four short questions so we can route you correctly. This takes under a minute.
        </p>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Step {step} of {STEPS}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={reduceMotion ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: -10 }}
              transition={reduceMotion ? { duration: 0 } : vtSpring.reveal}
              className="space-y-4"
            >
              {step === 1 ? (
                <>
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-foreground">
                      What&apos;s your biggest thumbnail problem?
                    </span>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {LEAD_PROBLEM_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setBiggestProblem(option.value);
                            trackEvent('lead_qualification_step', { problem: option.value, from_step: 1, to_step: 2 });
                            setStep(2);
                          }}
                          className={cn(
                            'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition-all duration-200',
                            biggestProblem === option.value
                              ? 'border-primary bg-primary/10 text-primary shadow-sm shadow-black/25 ring-1 ring-primary/25'
                              : 'border-border bg-background text-muted-foreground hover:border-[color:var(--border-hover)] hover:text-foreground active:scale-[0.99]',
                          )}
                        >
                          <option.icon className="h-4 w-4 shrink-0" />
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="lq-subscribers" className="text-sm font-medium text-foreground">
                      Subscriber count
                    </label>
                    <LeadCustomSelect
                      id="lq-subscribers"
                      value={subscriberCount}
                      onChange={setSubscriberCount}
                      options={LEAD_SUBSCRIBER_OPTIONS}
                      placeholder="Select range"
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                    <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setStep(1)}>
                      ← Back
                    </Button>
                    <Button type="button" className="sm:min-w-[8rem]" disabled={!subscriberCount} onClick={() => {
                      trackEvent('lead_qualification_step', { from_step: 2, to_step: 3 });
                      setStep(3);
                    }}>
                      Continue
                    </Button>
                  </div>
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="lq-videos" className="text-sm font-medium text-foreground">
                      How many videos per week?
                    </label>
                    <LeadCustomSelect
                      id="lq-videos"
                      value={videosPerWeek}
                      onChange={setVideosPerWeek}
                      options={LEAD_VIDEOS_PER_WEEK_OPTIONS}
                      placeholder="Select frequency"
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                    <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setStep(2)}>
                      ← Back
                    </Button>
                    <Button type="button" className="sm:min-w-[8rem]" disabled={!videosPerWeek} onClick={nextFromStep3}>
                      Continue
                    </Button>
                  </div>
                </>
              ) : null}

              {step === 4 ? (
                <>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="lq-channel" className="text-sm font-medium text-foreground">
                      YouTube link <span className="text-primary">*</span>
                    </label>
                    <Input
                      id="lq-channel"
                      type="url"
                      inputMode="url"
                      autoComplete="url"
                      placeholder="https://www.youtube.com/@yourchannel or …/watch?v=…"
                      value={channelUrl}
                      onChange={(e) => {
                        setChannelUrl(e.target.value);
                        if (channelError) setChannelError('');
                      }}
                      className={authFormInputClassName}
                      aria-invalid={channelError ? true : undefined}
                      aria-describedby={channelError ? 'lq-channel-err' : 'lq-channel-hint'}
                    />
                    {channelError ? (
                      <p id="lq-channel-err" className="text-sm text-destructive" role="alert">
                        {channelError}
                      </p>
                    ) : null}
                    <p id="lq-channel-hint" className="text-xs text-muted-foreground">
                      Channel, @handle, or video URL — we use it to personalize your workspace.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                    <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setStep(3)}>
                      ← Back
                    </Button>
                    <Button
                      type="button"
                      className="sm:min-w-[8rem]"
                      disabled={mutation.isPending}
                      onClick={() => void submitFinal()}
                    >
                      {mutation.isPending ? 'Saving…' : 'Finish'}
                    </Button>
                  </div>
                </>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
