import * as Sentry from '@sentry/nextjs';
import { beforeSend } from '@/lib/sentry-scrub';

// PRD §10.1, §14, §20: 클라이언트 측 Sentry — PII 자동 스크러빙
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })],
  sendDefaultPii: false, // 기본 PII 전송 차단 (IP, 사용자 정보 등)
  beforeSend,
});
