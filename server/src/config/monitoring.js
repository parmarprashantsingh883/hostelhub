import * as Sentry from '@sentry/node';

/**
 * Error tracking — enabled only when SENTRY_DSN is set (production),
 * a silent no-op otherwise. captureError() is safe to call anywhere.
 */
const enabled = () => !!process.env.SENTRY_DSN;

export function initMonitoring() {
  if (!enabled()) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_RATE || 0.1),
  });
  console.log('🛰️  Sentry error tracking enabled');
}

export function captureError(err, context) {
  if (!enabled()) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}
