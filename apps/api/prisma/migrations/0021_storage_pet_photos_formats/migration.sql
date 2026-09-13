-- 0021 — pet-photos 버킷 업로드 제약 완화 (0009 의 jpeg·png·webp / 5MB → 이미지 전반 / 10MB)
--
-- 배경:
--   방문 인증(검증 배지)이 현장 사진의 EXIF 를 쓰는데, 아이폰 기본 포맷 HEIC 가 막혀 있어
--   사용자가 카메라 설정을 바꾸지 않으면 인증 자체가 불가능했다. 최신 폰 원본 JPEG 도 5MB 를 넘긴다.
--
-- 유지하는 제약:
--   svg 는 계속 막는다 — 스크립트를 품을 수 있어 공개 버킷에서 저장형 XSS 가 된다.
--
-- 클라이언트(apps/web/lib/upload.ts)의 허용 목록·크기와 반드시 같아야 한다.

update storage.buckets
set file_size_limit = 10485760, -- 10 MiB
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp',
      'image/heic', 'image/heif', 'image/gif', 'image/avif'
    ]
where id = 'pet-photos';
