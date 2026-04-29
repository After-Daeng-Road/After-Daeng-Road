import { Resend } from 'resend';

// PRD §16.4 — 트랜잭션/마케팅 이메일 발송 인프라

let cached: Resend | null = null;

export function getResend(): Resend {
  if (!cached) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY 미설정');
    }
    cached = new Resend(process.env.RESEND_API_KEY);
  }
  return cached;
}

export const FROM_ADDRESS = '댕로드 <noreply@daengroad.app>';
