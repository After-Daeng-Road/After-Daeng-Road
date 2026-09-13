// 사진 업로드 유틸 — pet-photos 버킷 (migration 0009)
// A방식: 브라우저에서 유저 supabaseAccessToken 으로 인증해 직접 업로드.
// RLS: 로그인 유저가 본인 폴더(auth.uid()=첫 폴더)에만 insert / public read.
// 경로 규칙: {userId}/{purpose}/{poiId}/{uuid}.{ext}
// 제약: 이미지(svg 제외) 10MB 이하 — 버킷(0021)과 동일. 서버 거부 전에 클라에서 먼저 차단.
//   svg 는 스크립트를 품을 수 있어(저장형 XSS) 계속 막는다. HEIC/HEIF 는 아이폰 기본 포맷이라 허용 —
//   방문 인증은 EXIF 만 쓰므로 표시 문제가 없고, 후기 사진은 Safari 외 브라우저에서 안 보일 수 있다.

import { createBrowserClient } from '@supabase/ssr';
import { COPY } from '@/lib/copy';

const BUCKET = 'pet-photos';
const MAX_SIZE = 10 * 1024 * 1024; // 10 MiB — 최신 폰 원본 JPEG(3~6MB)·HEIC 가 들어오게
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/gif': 'gif',
  'image/avif': 'avif',
};
// 브라우저가 MIME 을 비워 보내는 경우(일부 안드로이드·HEIC)는 확장자로 보완한다
const EXT_FALLBACK: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  gif: 'image/gif',
  avif: 'image/avif',
};

/** 파일의 MIME — 비어 있으면 확장자로 추정 */
export function resolveMime(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') return file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_FALLBACK[ext] ?? '';
}

export type UploadPurpose = 'reviews' | 'verifications';

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

export function validatePhoto(file: File): { ok: true } | { ok: false; error: string } {
  if (!ALLOWED[resolveMime(file)]) return { ok: false, error: COPY.upload.invalidType };
  if (file.size > MAX_SIZE) return { ok: false, error: COPY.upload.tooLarge };
  return { ok: true };
}

export async function uploadPhoto(
  file: File,
  opts: { accessToken: string; userId: string; purpose: UploadPurpose; poiId: string },
): Promise<UploadResult> {
  const valid = validatePhoto(file);
  if (!valid.ok) return valid;

  const mime = resolveMime(file);
  const ext = ALLOWED[mime];
  const path = `${opts.userId}/${opts.purpose}/${opts.poiId}/${crypto.randomUUID()}.${ext}`;

  // 유저 JWT 를 Authorization 헤더로 실어 RLS(auth.uid()) 통과
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${opts.accessToken}` } } },
  );

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: mime,
    upsert: false,
  });
  if (error) return { ok: false, error: COPY.upload.failed };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
