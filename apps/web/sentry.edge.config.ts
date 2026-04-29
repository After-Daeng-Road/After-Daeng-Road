import * as Sentry from '@sentry/nextjs';
import { beforeSend } from '@/lib/sentry-scrub';

// Edge Runtime (middleware, Edge Route Handlers) — PII 스크러빙
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend,
});
