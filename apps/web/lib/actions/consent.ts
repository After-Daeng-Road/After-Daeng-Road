'use server';

// PRD §14, §14.2 — 이용약관/개인정보/위치/마케팅 동의 기록 (append-only 이력)
// 동의 UI(체크박스·노출)는 FE 담당. 이 액션은 동의 이벤트를 user_consents 에 적재하고
// (userId, kind) 별 최신 상태를 조회한다. 버전은 클라이언트를 신뢰하지 않고 서버 상수를 쓴다(변조 방지).

import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getClientIp } from '@/lib/rate-limit';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { CONSENT_VERSIONS, type ConsentKind } from '@/lib/constants';

const KINDS = ['TERMS', 'PRIVACY', 'LOCATION', 'MARKETING_EMAIL', 'PET_HEALTH'] as const;

const RecordConsentSchema = z.object({
  consents: z
    .array(
      z.object({
        kind: z.enum(KINDS),
        agreed: z.boolean().default(true), // false=철회
      }),
    )
    .min(1)
    .max(KINDS.length),
});

export type RecordConsentInput = z.infer<typeof RecordConsentSchema>;

export async function recordConsent(input: RecordConsentInput) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: 'Unauthorized' };

  const parsed = RecordConsentSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };

  const userId = session.user.id;
  const ip = await getClientIp();
  const ipAddress = ip === 'unknown' ? null : ip; // @db.Inet 에 'unknown' 저장 방지
  const userAgent = (await headers()).get('user-agent') ?? null;

  await prisma.userConsent.createMany({
    data: parsed.data.consents.map((c) => ({
      userId,
      kind: c.kind,
      version: CONSENT_VERSIONS[c.kind], // 서버 신뢰 버전
      agreed: c.agreed,
      ipAddress,
      userAgent,
    })),
  });

  revalidatePath('/me');
  return { ok: true as const };
}

type ConsentState = { agreed: boolean; version: string; recordedAt: Date };

// (userId, kind) 별 최신 동의 상태 — 온보딩/설정 화면에서 "이미 동의했는지" 판단용
export async function getConsentStatus(): Promise<Partial<Record<ConsentKind, ConsentState>>> {
  const session = await auth();
  if (!session?.user?.id) return {};

  const rows = await prisma.userConsent.findMany({
    where: { userId: session.user.id },
    orderBy: { recordedAt: 'desc' },
  });

  const latest: Partial<Record<ConsentKind, ConsentState>> = {};
  for (const r of rows) {
    if (!latest[r.kind as ConsentKind]) {
      latest[r.kind as ConsentKind] = {
        agreed: r.agreed,
        version: r.version,
        recordedAt: r.recordedAt,
      };
    }
  }
  return latest;
}
