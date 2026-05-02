'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, DollarSign, FlaskConical, MousePointerClick, Paintbrush } from 'lucide-react';
import { BrandWordmark } from '@/components/layout/brand-wordmark';
import { useSignUpMutation } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { AppRoutes } from '@/config/routes';
import { AuthThumbnailMarquee } from '@/components/auth/auth-thumbnail-marquee';
import { collectLeadAttribution, type LeadAttribution } from '@/lib/lead-attribution';
import { cn } from '@/lib/utils';
import { LeadCustomSelect } from '@/components/ui/lead-custom-select';
import { submitLeadIntake } from '@/lib/api/lead-intake';
import { isLikelyYoutubeUrl, normalizeHttpUrl } from '@/lib/youtube-channel-url';
import { trackEvent } from '@/lib/analytics';
import { vtSpring } from '@/lib/motion-presets';

const PROBLEM_OPTIONS = [
  { value: 'time', label: 'Takes too long', icon: Clock },
  { value: 'cost', label: 'Designers cost too much', icon: DollarSign },
  { value: 'ctr', label: 'My CTR is low', icon: MousePointerClick },
  { value: 'design', label: "I can't design", icon: Paintbrush },
  { value: 'testing', label: "Can't A/B test", icon: FlaskConical },
] as const;

const SUBSCRIBER_OPTIONS = [
  'Under 1,000',
  '1,000 – 5,000',
  '5,000 – 15,000',
  '15,000 – 30,000',
  '30,000+',
] as const;

const VIDEOS_PER_WEEK_OPTIONS = ['1–2 videos', '3–4 videos', '5+ videos'] as const;

export default function RegisterPage() {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [biggestProblem, setBiggestProblem] = useState('');
  const [subscriberCount, setSubscriberCount] = useState('');
  const [videosPerWeek, setVideosPerWeek] = useState('');
  const [email, setEmail] = useState('');
  const [channelUrl, setChannelUrl] = useState('');
  const [password, setPassword] = useState('');
  const [attribution, setAttribution] = useState<LeadAttribution>({});
  const [error, setError] = useState('');
  const [channelStepError, setChannelStepError] = useState('');
  const [channelSubmitting, setChannelSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  const router = useRouter();
  const signUp = useSignUpMutation();
  const leadSessionId = useMemo(() => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }, []);
  const inputClassName =
    'motion-base h-auto rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-border-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0';

  useEffect(() => {
    setAttribution(collectLeadAttribution());
    trackEvent('signup_started', { source: 'register_page' });
  }, []);

  const totalSteps = 5;
  const progressPercent = (step / totalSteps) * 100;

  const nextStep = useCallback(() => {
    setStep((prev) => (prev < totalSteps ? ((prev + 1) as typeof prev) : prev));
  }, [totalSteps]);

  const prevStep = useCallback(() => {
    setStep((prev) => (prev > 1 ? ((prev - 1) as typeof prev) : prev));
  }, []);

  async function completeChannelStep() {
    const normalized = normalizeHttpUrl(channelUrl);
    if (!isLikelyYoutubeUrl(normalized)) {
      setChannelStepError('Paste a valid YouTube link (channel, @handle, or video URL).');
      return;
    }
    setChannelStepError('');
    setChannelUrl(normalized);
    setChannelSubmitting(true);
    const crm = await submitLeadIntake({
      lead_session_id: leadSessionId,
      funnel_stage: 'register_wizard_step_4',
      channel_url: normalized,
      biggest_thumbnail_problem: biggestProblem || undefined,
      subscriber_count: subscriberCount || undefined,
      videos_per_week: videosPerWeek || undefined,
      ...attribution,
    });
    setChannelSubmitting(false);
    if (!crm.ok) {
      toast.warning(crm.message + ' You can still create your account.');
    }
    nextStep();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    signUp.mutate(
      {
        email,
        password,
        metadata: {
          lead_session_id: leadSessionId,
          biggest_thumbnail_problem: biggestProblem || undefined,
          subscriber_count: subscriberCount || undefined,
          videos_per_week: videosPerWeek || undefined,
          channel_url: normalizeHttpUrl(channelUrl).trim() || undefined,
          ...attribution,
        },
      },
      {
        onSuccess: () => {
          trackEvent('signup_completed', {
            lead_session_id: leadSessionId,
            has_channel_url: Boolean(normalizeHttpUrl(channelUrl).trim()),
            biggest_thumbnail_problem: biggestProblem || undefined,
            subscriber_count: subscriberCount || undefined,
            videos_per_week: videosPerWeek || undefined,
          });
          void submitLeadIntake({
            lead_session_id: leadSessionId,
            funnel_stage: 'signup_completed',
            email: email.trim() || undefined,
            channel_url: normalizeHttpUrl(channelUrl).trim(),
            biggest_thumbnail_problem: biggestProblem || undefined,
            subscriber_count: subscriberCount || undefined,
            videos_per_week: videosPerWeek || undefined,
            ...attribution,
          });
          setRegistered(true);
          toast.success('Confirm your email to activate account.');
        },
        onError: (err) => {
          const message =
            err instanceof Error ? err.message : 'Failed to sign up. Please try again.';
          setError(message);
        },
      },
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-stretch bg-background">
      <div className="flex w-full flex-col px-6 py-8 sm:px-10 lg:w-1/2 lg:px-16">
        <header className="mb-10 flex items-center justify-between">
          <BrandWordmark className="text-base" />
          <div className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href={AppRoutes.home} className="font-medium text-foreground hover:underline">
              Sign in
            </Link>
          </div>
        </header>

        <main className="flex flex-1 items-center">
          <div className="w-full max-w-md">
            <AnimatePresence mode="wait" initial={false}>
              {!registered ? (
                <motion.div
                  key="register-wizard"
                  className="space-y-8"
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                  transition={reduceMotion ? { duration: 0 } : vtSpring.reveal}
                >
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                      {step < 5 ? (
                        <>
                          Answer <span className="text-primary">four questions</span>
                        </>
                      ) : (
                        <>
                          Create your <span className="text-primary">account</span>
                        </>
                      )}
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {step < 5
                        ? 'Answer a few quick questions, then continue when you are ready.'
                        : 'Last step: email and password.'}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="surface space-y-4 p-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {step < 5 ? (
                            <>
                              {step === 4 ? 'Almost done' : `Question ${step} of ${totalSteps - 1}`}
                            </>
                          ) : (
                            'Account'
                          )}
                        </span>
                        <span>{Math.round(progressPercent)}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={step}
                        initial={reduceMotion ? false : { opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={reduceMotion ? undefined : { opacity: 0, x: -12 }}
                        transition={reduceMotion ? { duration: 0 } : vtSpring.reveal}
                        className="space-y-4"
                      >
                        {step === 1 ? (
                    <>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-foreground">
                          What&apos;s your biggest thumbnail problem?
                        </label>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {PROBLEM_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setBiggestProblem(option.value);
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
                      <Button
                        type="button"
                        className="w-full"
                        disabled={!biggestProblem}
                        onClick={nextStep}
                      >
                        Continue
                      </Button>
                    </>
                  ) : step === 2 ? (
                    <>
                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor="register-subscribers"
                          className="text-sm font-medium text-foreground"
                        >
                          Subscriber count
                        </label>
                        <LeadCustomSelect
                          id="register-subscribers"
                          value={subscriberCount}
                          onChange={setSubscriberCount}
                          options={SUBSCRIBER_OPTIONS}
                          placeholder="Select range"
                        />
                      </div>
                      <Button
                        type="button"
                        className="w-full"
                        disabled={!subscriberCount}
                        onClick={nextStep}
                      >
                        Continue
                      </Button>
                      <button
                        type="button"
                        onClick={prevStep}
                        className="w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        ← Change previous answer
                      </button>
                    </>
                  ) : step === 3 ? (
                    <>
                      <div className="flex flex-col gap-2">
                        <label htmlFor="register-uploads" className="text-sm font-medium text-foreground">
                          How many videos per week?
                        </label>
                        <LeadCustomSelect
                          id="register-uploads"
                          value={videosPerWeek}
                          onChange={setVideosPerWeek}
                          options={VIDEOS_PER_WEEK_OPTIONS}
                          placeholder="Select frequency"
                        />
                      </div>
                      <Button
                        type="button"
                        className="w-full"
                        disabled={!videosPerWeek}
                        onClick={nextStep}
                      >
                        Continue
                      </Button>
                      <button
                        type="button"
                        onClick={prevStep}
                        className="w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        ← Change previous answer
                      </button>
                    </>
                  ) : step === 4 ? (
                    <>
                      <div className="flex flex-col gap-2">
                        <label htmlFor="register-channel-url" className="text-sm font-medium text-foreground">
                          YouTube link <span className="text-primary">*</span>
                        </label>
                        <Input
                          id="register-channel-url"
                          type="url"
                          inputMode="url"
                          autoComplete="url"
                          placeholder="https://www.youtube.com/@yourchannel or …/watch?v=…"
                          value={channelUrl}
                          onChange={(e) => {
                            setChannelUrl(e.target.value);
                            if (channelStepError) setChannelStepError('');
                          }}
                          className={inputClassName}
                          aria-invalid={channelStepError ? true : undefined}
                          aria-describedby={
                            channelStepError ? 'register-channel-error register-channel-hint' : 'register-channel-hint'
                          }
                        />
                        {channelStepError ? (
                          <p id="register-channel-error" className="text-sm text-destructive" role="alert">
                            {channelStepError}
                          </p>
                        ) : null}
                      </div>
                      <p id="register-channel-hint" className="text-center text-xs text-muted-foreground">
                        Channel, @handle, or video URL — we use it to personalize your workspace.
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <button
                          type="button"
                          onClick={prevStep}
                          className="order-2 text-center text-xs text-muted-foreground transition-colors hover:text-foreground sm:order-1 sm:text-left"
                        >
                          ← Back
                        </button>
                        <Button
                          type="button"
                          className="order-1 w-full sm:order-2 sm:w-auto sm:min-w-[11rem]"
                          disabled={channelSubmitting}
                          onClick={() => void completeChannelStep()}
                        >
                          {channelSubmitting ? 'Saving…' : 'Continue →'}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-lg border border-primary/20 bg-primary/[0.08] px-3 py-2 text-xs text-foreground/90">
                        You&apos;re set — add email and password to finish.
                      </div>
                      <div className="flex flex-col gap-2">
                        <label htmlFor="register-email" className="text-sm font-medium text-foreground">
                          Your email
                        </label>
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className={inputClassName}
                          aria-invalid={error ? true : undefined}
                          aria-describedby={error ? 'register-signup-error' : undefined}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label htmlFor="register-password" className="text-sm font-medium text-foreground">
                          Password
                        </label>
                        <Input
                          id="register-password"
                          type="password"
                          placeholder="At least 6 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          className={inputClassName}
                          aria-invalid={error ? true : undefined}
                          aria-describedby={error ? 'register-signup-error' : undefined}
                        />
                      </div>
                      {error ? (
                        <p id="register-signup-error" className="text-sm text-destructive" role="alert">
                          {error}
                        </p>
                      ) : null}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
                        <button
                          type="button"
                          onClick={prevStep}
                          className="text-center text-xs text-muted-foreground transition-colors hover:text-foreground sm:text-left"
                        >
                          ← Edit onboarding answers
                        </button>
                        <Button type="submit" className="w-full sm:ml-auto sm:w-auto sm:min-w-[12rem]" disabled={signUp.isPending}>
                          {signUp.isPending ? 'Creating account…' : 'Create account →'}
                        </Button>
                      </div>
                    </>
                  )}
                      </motion.div>
                    </AnimatePresence>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="register-complete"
                  className="surface space-y-4 p-6"
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduceMotion ? { duration: 0 } : vtSpring.reveal}
                >
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    Confirm your email
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ve sent a confirmation link to <span className="font-medium">{email}</span>.
                    Open it to activate your account, then sign in from the login page.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push(AppRoutes.home)}
                  >
                    Go to sign in
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden border-l border-border bg-card text-foreground lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,59,59,0.08),_transparent_55%),_radial-gradient(ellipse_at_bottom_left,_rgba(255,255,255,0.04),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,_transparent_60%,_rgba(0,0,0,0.15))]" />
        <div className="relative z-[2] w-full space-y-12 px-10">
          <div className="mx-auto max-w-xl space-y-6">
            <h2 className="text-3xl font-semibold leading-tight">
              Store faces once.
              <br />
              Reuse thumbnail recipes per upload.
            </h2>
            <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
              Saved likenesses and niche-ready templates stay pinned to each workspace—less setup before every publish.
            </p>
          </div>
          <AuthThumbnailMarquee />
        </div>
      </div>
    </div>
  );
}
