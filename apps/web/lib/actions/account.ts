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
//   (3) 방문 인증 사진을 지운다 — 후기 사진은 남긴다(아래 KEEP_PURPOSES)
//   (4) deletedAt 을 찍는다
//
// 후기는 남되 작성자가 익명 행이 되어 재식별이 끊긴다.
//
// ═══ 행 자체는 지우지 않는다 (0019) ═══
// 위 (1) 을 마치면 users 에 남는 컬럼은 id(UUID)·locale·email_notify_*·role·타임스탬프뿐이고
// 어느 것도 개인을 식별하지 못한다. 재식별 키가 없으므로 §21 이 말하는 파기 대상이 아니다.
//
// 0018 은 30일 뒤 DELETE FROM users 를 했는데, users 참조 FK 8개가 전부 CASCADE 라
// 그 한 줄이 후기·사장님 답글·벤더·북마크를 연쇄 삭제했다. 소프트 딜리트를 택한 이유를
// 30일 뒤에 스스로 무너뜨리는 설계였다. 0019 가 걷어냈다.
//
// 대신 30일 뒤 지우는 것은 user_consents 의 ip_address·user_agent 다.
// IP 는 개인정보이고, 행을 남기기로 한 이상 그대로 두면 영구 보관이 된다.
// 동의 사실·종류·약관 버전·시각은 남아 증빙 가치를 유지한다.
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
 * 후기에 첨부된 사진은 지우지 않는다.
 *
 * 경로가 {userId}/{purpose}/{poiId}/{uuid}.{ext} 이고 purpose 는 'reviews' | 'verifications' 다.
 * 후기 행은 익명 처리해 남기는데 파일만 지우면 Review.photos 의 URL 이 살아 있는 채로
 * 이미지가 깨진다. 남기는 콘텐츠의 일부이므로 함께 남긴다.
 *
 * verifications 사진은 지운다 — EXIF 촬영 좌표·시각이 담긴 위치 이력이다.
 */
const KEEP_PURPOSES = new Set(['reviews']);

/**
 * Storage 의 사용자 폴더에서 KEEP_PURPOSES 를 제외하고 지운다.
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
      // depth 1 의 하위가 purpose 다. 남길 용도면 통째로 건너뛴다.
      if (depth === 1 && KEEP_PURPOSES.has(entry.name)) continue;
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
