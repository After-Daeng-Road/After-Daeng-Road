import * as Sentry from '@sentry/nextjs';
import { beforeSend } from '@/lib/sentry-scrub';

// 서버 컴포넌트 / Server Actions / Route Handlers — PII 스크러빙
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend,
});
