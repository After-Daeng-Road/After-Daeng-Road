-- 댕로드 — 리뷰/방문인증 사진 업로드용 Supabase Storage 버킷 + RLS
-- PRD §6.3(방문 인증), Step4(리뷰) — createReview.photos[] / checkIn.photoUrl 이 참조할 public URL 생성처
-- 경로 규칙: {userId}/{용도}/{poiId}/{uuid}.ext  (1번째 폴더 = auth.uid() = public.users.id, uuid)
-- storage.objects 는 전 버킷 공유 테이블이라 모든 정책을 bucket_id 로 스코프한다.

-- ═══════════════ 1. 버킷 ═══════════════
-- public read / 5MB / jpeg·png·webp 만 (svg 제외 = 저장형 XSS 방어; heic 제외 = FE 가 webp 변환)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pet-photos',
  'pet-photos',
  true,
  5242880, -- 5 MiB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ═══════════════ 2. RLS 정책 (storage.objects) ═══════════════

-- 업로드: 로그인 유저가 "본인 폴더"에만
drop policy if exists "pet_photos_insert_own" on storage.objects;
create policy "pet_photos_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'pet-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 읽기: public (공개 버킷)
drop policy if exists "pet_photos_select_public" on storage.objects;
create policy "pet_photos_select_public"
on storage.objects for select to public
using ( bucket_id = 'pet-photos' );

-- 수정(덮어쓰기): 본인 파일만
drop policy if exists "pet_photos_update_own" on storage.objects;
create policy "pet_photos_update_own"
on storage.objects for update to authenticated
using ( bucket_id = 'pet-photos' and (storage.foldername(name))[1] = auth.uid()::text )
with check ( bucket_id = 'pet-photos' and (storage.foldername(name))[1] = auth.uid()::text );

-- 삭제: 본인 파일만
drop policy if exists "pet_photos_delete_own" on storage.objects;
create policy "pet_photos_delete_own"
on storage.objects for delete to authenticated
using ( bucket_id = 'pet-photos' and (storage.foldername(name))[1] = auth.uid()::text );
