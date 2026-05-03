'use client';

/**
 * Support contact → POST /api/support/contact → Telegram.
 * Keep markup/classes in sync with ViralThumbnailsLanding/components/SupportWidget.tsx
 */

import { useEffect, useState } from 'react';
import { ArrowUpRight, MessageCircle, Send, X } from 'lucide-react';

export type SupportWidgetProps = {
  source: 'landing' | 'app';
  /** Prefill email (e.g. signed-in user). */
  defaultEmail?: string;
  /**
   * POST URL. If omitted: `NEXT_PUBLIC_SUPPORT_API_URL` or same-origin `/api/support/contact`.
   * Landing should set `NEXT_PUBLIC_SUPPORT_API_URL` to the full backend URL.
   */
  postUrl?: string;
};

const QUICK = ['How does it work?', 'Pricing question', 'Need help'] as const;

export function SupportWidget({ source, defaultEmail = '', postUrl: postUrlProp }: SupportWidgetProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [postUrl, setPostUrl] = useState('');
  const [email, setEmail] = useState(defaultEmail);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setEmail(defaultEmail);
  }, [defaultEmail]);

  useEffect(() => {
    if (postUrlProp?.trim()) {
      setPostUrl(postUrlProp.trim());
      return;
    }
    const fromEnv = process.env.NEXT_PUBLIC_SUPPORT_API_URL?.trim();
    if (fromEnv) {
      setPostUrl(fromEnv);
      return;
    }
    if (typeof window !== 'undefined') {
      setPostUrl(`${window.location.origin}/api/support/contact`);
    }
  }, [postUrlProp]);

  async function handleSubmit() {
    setError(null);
    const em = email.trim();
    const msg = message.trim();
    if (!em || !msg) {
      setError('Please enter your email and message.');
      return;
    }
    if (!postUrl) {
      setError('Support URL is not ready. Try again.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: em,
          message: msg,
          name: name.trim() || undefined,
          source,
          page_url: typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : undefined,
          company: honeypot || undefined,
        }),
      });
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      const ok = res.ok && body && typeof body === 'object' && 'ok' in body && (body as { ok: boolean }).ok;
      if (ok) {
        setSent(true);
        setMessage('');
        setTimeout(() => setSent(false), 8000);
        return;
      }
      let messageText: string | null = null;
      if (body && typeof body === 'object' && 'message' in body) {
        const m = (body as { message: unknown }).message;
        if (Array.isArray(m)) {
          messageText = (m as string[]).filter((x) => typeof x === 'string').join(', ');
        } else if (typeof m === 'string') {
          messageText = m;
        }
      }
      setError(messageText || `Something went wrong (${res.status}). Try again later.`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      <div
        className={`mb-3 w-[320px] origin-bottom-right overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/40 transition-all duration-300 sm:w-[340px] ${
          open
            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-4 scale-95 opacity-0'
        }`}
      >
        <div className="relative flex items-center gap-3 bg-gradient-to-r from-red-600 to-red-500 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">ViralThumblify Support</div>
            <div className="flex items-center gap-1.5 text-xs text-white/85">
              <span className="h-2 w-2 rounded-full bg-white/90" />
              We reply by email
            </div>
          </div>
        </div>

        <div className="relative px-5 py-4 text-zinc-100">
          {sent ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
                <ArrowUpRight className="h-6 w-6 text-red-400" />
              </div>
              <p className="mt-3 text-sm font-medium text-zinc-100">Request received</p>
              <p className="mt-1 text-xs text-zinc-400">We&apos;ll review it and get back to you at your email.</p>
            </div>
          ) : (
            <>
              <div
                className={`mb-4 rounded-xl rounded-tl-none border border-zinc-700/80 bg-zinc-800/80 px-4 py-3 text-sm text-zinc-300 transition-all duration-500 ${
                  open ? 'translate-x-0 opacity-100 delay-200' : '-translate-x-2 opacity-0'
                }`}
              >
                Hey! 👋 Send us a message — we&apos;ll follow up by email.
              </div>

              <div
                className={`mb-4 flex flex-wrap gap-2 transition-all duration-500 ${
                  open ? 'translate-y-0 opacity-100 delay-300' : 'translate-y-2 opacity-0'
                }`}
              >
                {QUICK.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setMessage(q)}
                    className="rounded-full border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition-all hover:border-red-500/50 hover:text-zinc-100"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <div
                className={`transition-all duration-500 ${
                  open ? 'translate-y-0 opacity-100 delay-[350ms]' : 'translate-y-2 opacity-0'
                }`}
              >
                <label className="sr-only" htmlFor="support-email">
                  Email
                </label>
                <input
                  id="support-email"
                  type="email"
                  autoComplete="email"
                  placeholder="Your email *"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mb-3 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-all focus:border-red-500 focus:ring-2 focus:ring-red-500/25"
                />
              </div>

              <div
                className={`transition-all duration-500 ${
                  open ? 'translate-y-0 opacity-100 delay-[380ms]' : 'translate-y-2 opacity-0'
                }`}
              >
                <label className="sr-only" htmlFor="support-name">
                  Name (optional)
                </label>
                <input
                  id="support-name"
                  type="text"
                  placeholder="Your name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mb-3 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-all focus:border-red-500 focus:ring-2 focus:ring-red-500/25"
                />
              </div>

              <div
                className={`transition-all duration-500 ${
                  open ? 'translate-y-0 opacity-100 delay-[400ms]' : 'translate-y-2 opacity-0'
                }`}
              >
                <label className="sr-only" htmlFor="support-message">
                  Message
                </label>
                <textarea
                  id="support-message"
                  placeholder="Your message *"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mb-3 w-full resize-none rounded-lg border border-zinc-600 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-all focus:border-red-500 focus:ring-2 focus:ring-red-500/25"
                />
              </div>

              {/* Honeypot — must stay empty (field name `company` on API). */}
              <div className="sr-only" aria-hidden>
                <label htmlFor="support-company">Company</label>
                <input
                  id="support-company"
                  tabIndex={-1}
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  autoComplete="off"
                />
              </div>

              {error ? <p className="mb-2 text-xs text-red-400">{error}</p> : null}

              <div
                className={`transition-all duration-500 ${
                  open ? 'translate-y-0 opacity-100 delay-[450ms]' : 'translate-y-2 opacity-0'
                }`}
              >
                <button
                  type="button"
                  disabled={submitting || !postUrl}
                  onClick={() => void handleSubmit()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-red-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:from-red-500 hover:to-red-500 disabled:opacity-60 active:scale-[0.98]"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? 'Sending…' : 'Send message'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close support' : 'Open support'}
        className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-red-500 shadow-lg shadow-red-900/40 transition-all duration-300 hover:shadow-xl hover:shadow-red-900/50 ${
          mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        } ${open ? 'rotate-0' : 'hover:scale-105'}`}
      >
        <MessageCircle
          className={`absolute h-6 w-6 text-white transition-all duration-300 ${
            open ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
          }`}
        />
        <X
          className={`absolute h-6 w-6 text-white transition-all duration-300 ${
            open ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
          }`}
        />
      </button>
    </div>
  );
}
