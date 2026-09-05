'use server';

// 회원 탈퇴 (개인정보보호법 §21 파기 · §36 삭제 요구권)
//
// 개인정보처리방침은 "회원 탈퇴 시 즉시 삭제(분쟁 대비 30일 보관 후 완전 파기)"를
// 고지하고 있었으나 기능 자체가 없었다. 이행 불가능한 약속을 고지한 상태였다.
//
// ═══ 왜 즉시 행 삭제가 아닌가 ═══
// users 와 연결된 전 관계가 onDelete: Cascade 다. 행을 지우면 공개 후기까지 사라져
// 다른 이용자가 읽던 커뮤니티 콘텐츠가 소급 삭제된다.
//
// 대신 탈퇴 시점에
//   (1) 식별정보를 즉시 비운다 — email·provider id·닉네임·기준 주소/좌표
//   (2) 개인 데이터를 즉시 지운다 — 반려견, 북마크, 추천 이력(출발지 좌표), 방문 인증(EXIF 좌표)
//   (3) 사진을 지운다 — Storage 의 {userId}/ 하위 전부
//   (4) deletedAt 을 찍는다 → 30일 뒤 purge_deleted_users() 가 행을 완전 파기 (0018)
//
// 후기는 남되 작성자가 익명 행이 되어 재식별이 끊긴다.
//
// ═══ 식별자를 비우는 것이 필수인 이유 ═══
// email·kakaoId·naverId·googleId 에 @unique 가 걸려 있다. 값을 남기면 같은 계정으로
// 재가입할 때 유니크 충돌로 로그인 자체가 막힌다.

import { z } from 'zod';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const PHOTO_BUCKET = 'pet-photos';

const DeleteAccountSchema = z.object({
  /** 오조작 방지 — 화면에 표시한 확인 문구를 그대로 입력해야 한다 */
  confirmText: z.string().min(1),
});

export type DeleteAccountInput = z.infer<typeof DeleteAccountSchema>;

/** 화면과 서버가 같은 문구를 쓰도록 여기서 정의한다 */
export const DELETE_CONFIRM_TEXT = '탈퇴합니다';

/**
 * Storage 의 사용자 폴더를 통째로 지운다.
 * 경로 규칙은 {userId}/{purpose}/{poiId}/{uuid}.{ext} (lib/upload.ts).
 * service_role 이 필요하므로 서버에서만 호출한다.
 *
 * 실패해도 탈퇴 자체를 막지 않는다 — 계정 삭제가 파일 삭제 실패로 되돌려지면
 * 이용자는 탈퇴할 수단을 잃는다. 대신 반드시 로그를 남겨 수동 정리 근거를 만든다.
 */
async function deleteUserPhotos(userId: string): Promise<{ deleted: number; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { deleted: 0, error: 'SUPABASE_SERVICE_ROLE_KEY 미설정 — 사진 수동 정리 필요' };
  }

  const admin = createSupabaseClient(url, serviceKey, { auth: { persistSession: false } });
  const paths: string[] = [];

  // Storage list 는 한 단계씩만 내려간다. {userId}/{purpose}/{poiId}/ 3단을 훑는다.
  async function walk(prefix: string, depth: number): Promise<void> {
    if (depth > 3) return;
    const { data, error } = await admin.storage.from(PHOTO_BUCKET).list(prefix, { limit: 1000 });
    if (error || !data) return;
    for (const entry of data) {
      const full = `${prefix}/${entry.name}`;
      // id 가 있으면 파일, 없으면 폴더 (Supabase Storage 규약)
      if (entry.id) paths.push(full);
      else await walk(full, depth + 1);
    }
  }

  try {
    await walk(userId, 1);
    if (paths.length === 0) return { deleted: 0 };
    const { error } = await admin.storage.from(PHOTO_BUCKET).remove(paths);
    if (error) return { deleted: 0, error: error.message };
    return { deleted: paths.length };
  } catch (e) {
    return { deleted: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteAccount(input: DeleteAccountInput) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: 'Unauthorized' };

  const parsed = DeleteAccountSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: '입력이 올바르지 않습니다.' };
  if (parsed.data.confirmText.trim() !== DELETE_CONFIRM_TEXT) {
    return { ok: false as const, error: `확인 문구를 정확히 입력해 주세요.` };
  }

  const userId = session.user.id;

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { deletedAt: true },
  });
  if (!existing) return { ok: false as const, error: '계정을 찾을 수 없습니다.' };
  if (existing.deletedAt) return { ok: true as const, alreadyDeleted: true as const };

  // 사진 삭제는 트랜잭션 밖에서 먼저 시도한다 — 외부 호출이라 트랜잭션을 오래 잡으면 안 된다.
  const photos = await deleteUserPhotos(userId);
  if (photos.error) {
    console.error('[deleteAccount] Storage 정리 실패', userId, photos.error);
  }

  // 개인 데이터 삭제 + 식별정보 무효화를 한 트랜잭션으로 묶는다.
  // 중간에 끊겨 "식별자만 남고 데이터는 지워진" 상태가 되면 안 된다.
  await prisma.$transaction([
    // 출발지 좌표가 담긴 추천 이력
    prisma.recommendation.deleteMany({ where: { userId } }),
    // EXIF 촬영 좌표·시각이 담긴 방문 인증
    prisma.verification.deleteMany({ where: { userId } }),
    // 반려견 (pets_sensitive 는 Cascade 로 함께 삭제)
    prisma.pet.deleteMany({ where: { userId } }),
    prisma.bookmark.deleteMany({ where: { userId } }),
    // 후기는 남긴다 — 공개 콘텐츠이며 작성자가 익명 행이 되어 재식별이 끊긴다.
    // 동의 이력(user_consents)도 남긴다 — 분쟁 시 증빙이고 30일 뒤 행과 함께 파기된다.
    prisma.user.update({
      where: { id: userId },
      data: {
        // @unique 필드는 반드시 비운다. 남기면 재가입 시 유니크 충돌로 로그인이 막힌다.
        email: null,
        kakaoId: null,
        naverId: null,
        googleId: null,
        nickname: null,
        baseAddress: null,
        baseGeohash7: null,
        emailNotifyEnabled: false,
        deletedAt: new Date(),
      },
    }),
  ]);

  return { ok: true as const, photosDeleted: photos.deleted };
}
