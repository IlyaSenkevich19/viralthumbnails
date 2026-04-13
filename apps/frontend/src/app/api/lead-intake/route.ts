import { NextRequest, NextResponse } from 'next/server';

const WEBHOOK_URL = process.env.LEAD_INTAKE_WEBHOOK_URL?.trim();

/** Set `LEAD_INTAKE_DEBUG=1` or run `next dev` to get `debug` in JSON + server logs. */
const LEAD_INTAKE_DEBUG =
  process.env.LEAD_INTAKE_DEBUG === '1' || process.env.NODE_ENV === 'development';

function webhookOriginLabel(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname.slice(0, 24)}…`;
  } catch {
    return '(invalid URL)';
  }
}

type Body = {
  lead_session_id?: string;
  email?: string;
  channel_url?: string;
  biggest_thumbnail_problem?: string;
  subscriber_count?: string;
  videos_per_week?: string;
  funnel_stage?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  referrer?: string;
  page_path?: string;
  source?: string;
  /** Honeypot — must stay empty */
  company?: string;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    console.warn('[lead-intake] invalid JSON body');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.info('[lead-intake] POST', {
    funnel_stage: body.funnel_stage,
    lead_session_id: body.lead_session_id
      ? `${body.lead_session_id.slice(0, 8)}…`
      : '(missing)',
    has_email: Boolean(body.email?.trim()),
    has_channel: Boolean(body.channel_url?.trim()),
  });

  if (body.company) {
    console.info('[lead-intake] honeypot hit — skipped');
    return NextResponse.json({
      ok: true,
      skipped: true,
      skippedReason: 'honeypot',
      ...(LEAD_INTAKE_DEBUG && { debug: { phase: 'honeypot' } }),
    });
  }

  const channelUrl = typeof body.channel_url === 'string' ? body.channel_url.trim() : '';
  if (!channelUrl) {
    console.warn('[lead-intake] missing channel_url');
    return NextResponse.json({ error: 'channel_url is required' }, { status: 400 });
  }

  const host = req.headers.get('host') ?? '';
  const forwarded = {
    ...body,
    created_at: new Date().toISOString(),
    landing_domain: host || undefined,
    page_path: body.page_path ?? '/auth/register',
  };

  if (!WEBHOOK_URL) {
    console.warn(
      '[lead-intake] LEAD_INTAKE_WEBHOOK_URL is not set — Google Apps Script is never called (this explains 0 executions in Apps Script dashboard).',
    );
    return NextResponse.json({
      ok: true,
      skipped: true,
      skippedReason: 'no_webhook_url',
      ...(LEAD_INTAKE_DEBUG && {
        debug: {
          phase: 'no_upstream',
          message: 'Set LEAD_INTAKE_WEBHOOK_URL in .env.local and restart next dev.',
        },
      }),
    });
  }

  try {
    console.info('[lead-intake] forwarding to webhook', webhookOriginLabel(WEBHOOK_URL));
    const upstream = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(forwarded),
    });
    const upstreamCt = upstream.headers.get('content-type') ?? '';
    const textPreview = (await upstream.clone().text().catch(() => '')).slice(0, 160);

    if (!upstream.ok) {
      const authHint =
        upstream.status === 401 || upstream.status === 403
          ? 'Google Web App: open Deploy → Web app → set "Who has access" to Anyone (anonymous). Redeploy as New version. Use the /exec URL from that deployment, not the script editor test URL.'
          : undefined;
      console.warn('[lead-intake] upstream error', {
        status: upstream.status,
        contentType: upstreamCt,
        bodyPreview: textPreview,
        ...(authHint && { hint: authHint }),
      });
      return NextResponse.json(
        {
          error: 'CRM webhook rejected the request',
          ...(LEAD_INTAKE_DEBUG && {
            debug: {
              phase: 'upstream_error',
              upstreamStatus: upstream.status,
              upstreamContentType: upstreamCt,
              upstreamBodyPreview: textPreview,
              ...(authHint && { hint: authHint }),
            },
          }),
        },
        { status: 502 },
      );
    }

    console.info('[lead-intake] upstream OK', { status: upstream.status, contentType: upstreamCt });
    return NextResponse.json({
      ok: true,
      ...(LEAD_INTAKE_DEBUG && {
        debug: {
          phase: 'upstream_ok',
          upstreamStatus: upstream.status,
          upstreamContentType: upstreamCt,
        },
      }),
    });
  } catch (e) {
    console.warn('[lead-intake] forward failed', e);
    return NextResponse.json(
      {
        error: 'CRM webhook unreachable',
        ...(LEAD_INTAKE_DEBUG && {
          debug: { phase: 'fetch_throw', message: e instanceof Error ? e.message : String(e) },
        }),
      },
      { status: 502 },
    );
  }
}
