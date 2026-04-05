'use client';

import NProgress from 'nprogress';
import { useEffect } from 'react';

let configured = false;

let segmentDepth = 0;
let doneTimer: ReturnType<typeof setTimeout> | null = null;

function configureNProgressOnce() {
  if (configured) return;
  configured = true;
  NProgress.configure({
    showSpinner: false,
    trickle: true,
    trickleSpeed: 340,
    minimum: 0.08,
    easing: 'linear',
    speed: 280,
  });
  Object.assign(NProgress.settings as unknown as Record<string, unknown>, { trickleRate: 0.011 });
}

function acquireSegment() {
  if (doneTimer !== null) {
    clearTimeout(doneTimer);
    doneTimer = null;
  }
  segmentDepth += 1;
  if (segmentDepth === 1 && !NProgress.isStarted()) {
    NProgress.start();
  }
}

function releaseSegment() {
  segmentDepth = Math.max(0, segmentDepth - 1);
  if (segmentDepth > 0) return;
  doneTimer = setTimeout(() => {
    doneTimer = null;
    NProgress.done();
  }, 40);
}

export function RouteSegmentProgress() {
  useEffect(() => {
    configureNProgressOnce();
    acquireSegment();
    return () => releaseSegment();
  }, []);

  return null;
}
