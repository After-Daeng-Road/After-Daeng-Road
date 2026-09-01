// 사진 업로드 유틸 — pet-photos 버킷 (migration 0009)
// A방식: 브라우저에서 유저 supabaseAccessToken 으로 인증해 직접 업로드.
// RLS: 로그인 유저가 본인 폴더(auth.uid()=첫 폴더)에만 insert / public read.
// 경로 규칙: {userId}/{purpose}/{poiId}/{uuid}.{ext}
// 제약: jpeg·png·webp 만, 5MB 이하 (버킷과 동일 — 서버 거부 전에 클라에서 먼저 차단).

import { createBrowserClient } from '@supabase/ssr';
import { COPY } from '@/lib/copy';

const BUCKET = 'pet-photos';
const MAX_SIZE = 5 * 1024 * 1024; // 5 MiB
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export type UploadPurpose = 'reviews' | 'verifications';

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

export function validatePhoto(file: File): { ok: true } | { ok: false; error: string } {
  if (!ALLOWED[file.type]) return { ok: false, error: COPY.upload.invalidType };
  if (file.size > MAX_SIZE) return { ok: false, error: COPY.upload.tooLarge };
  return { ok: true };
}

export async function uploadPhoto(
  file: File,
  opts: { accessToken: string; userId: string; purpose: UploadPurpose; poiId: string },
): Promise<UploadResult> {
  const valid = validatePhoto(file);
  if (!valid.ok) return valid;

  const ext = ALLOWED[file.type];
  const path = `${opts.userId}/${opts.purpose}/${opts.poiId}/${crypto.randomUUID()}.${ext}`;

  // 유저 JWT 를 Authorization 헤더로 실어 RLS(auth.uid()) 통과
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${opts.accessToken}` } } },
  );

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { ok: false, error: COPY.upload.failed };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
