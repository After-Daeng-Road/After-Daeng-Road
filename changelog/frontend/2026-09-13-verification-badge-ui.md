# [frontend] 검증 배지 UI 완성 — 방문 인증 폼 · 배지 표시 · 가이드 모달

- **날짜**: 2026-09-13
- **브랜치**: `feature/departure-address-input` (← `dev`)
- **담당**: 프론트엔드
- **상태**: 구현·검증 완료, 커밋 대기

## 개요

검증 배지(PET_VERIFIED)는 뒷단이 완성돼 있었다 — `checkIn` 서버 액션(EXIF 1km·7일 판정),
DB 트리거(0003: 유효 인증 3명 → 부여, 6개월 만료), 만료 회수 크론 모두 정상 동작 중.
그런데 화면이 없었다.

- `checkIn` 을 호출하는 컴포넌트가 앱에 하나도 없었다 → 인증 0건, 배지 0건, 추천 점수의 검증 가중치 0.3 상시 0
- Edge 가 내려주는 `badges[]` 를 추천 카드가 읽지 않았고, 상세도 `badges` 를 조회만 하고 그리지 않았다
- 홈 우하단 "검증 배지" 플로팅 버튼은 클릭하면 사라지기만 했다 (UI 명세 4 는 설명 모달)

## 주요 변경

### 1. 방문 인증 폼 — `components/poi/checkin-form.tsx`

- 장소 상세의 검증 진행도 아래. 한적/보통/복잡 3단계 + 현장 사진 1장 → `checkIn`
- 비로그인은 후기 폼과 같은 로그인 게이트
- **EXIF 는 업로드 직전 원본 File 에서 읽는다** (`lib/exif.ts`, `exifr` 동적 import).
  스토리지 URL 이 된 뒤에는 읽을 수 없어 `PhotoUpload` 에 `onFileSelected` 콜백을 추가했다
- 사진 선택 직후 "위치 정보 있음 · N월 N일 촬영" / "위치 정보가 없어요 — 등록은 되지만 검증에는
  집계되지 않아요" 를 바로 보여준다. 조건(1km·7일)은 힌트로 명시
- 결과 토스트: 검증 집계됨 / 등록됐지만 미집계. 성공 시 `router.refresh()` 로 진행 바 갱신
- 서버 판정 규칙은 그대로 — 사진 없음·GPS 없음은 `isValid=false`

### 2. 배지 표시

- 추천 카드: `badges[]` 를 칩으로. PET_VERIFIED(로즈·BadgeCheck) 우선, WELLNESS·ECO 보조.
  TRAIL_OFFICIAL 은 `sourceLabel` 이 이미 "두루누비 코스" 라 생략
- 장소 상세: `poi.badges` 에 PET_VERIFIED 가 있으면 상단 칩 + 진행도 문구가
  "검증 배지 획득 — 실제 방문자 3명 이상이 사진으로 인증한 곳" 으로 바뀐다.
  이전엔 `verifiedCount >= 3` 로 체크 아이콘을 그렸는데, 배지는 트리거가 부여하고 6개월 뒤 회수되므로
  count 가 아니라 배지 존재로 판단하도록 바꿨다

### 3. 검증 배지 가이드 모달 — `components/recommend/floating-badge-guide.tsx`

- 클릭 → 조건 3줄(3명 · EXIF 1km/7일 · 6개월) + 참여 방법 안내
- '오늘 하루 보지 않기' 는 localStorage 날짜 (인트로 스플래시 규약), Esc·배경 클릭 닫기

### 기타

- `package.json`: `exifr@7.1.3` 추가 (EXIF 파서, 인증 폼에서만 동적 로드)
- `lib/copy.ts`: `poi.checkin.*`, `poi.verified*`, `home.badgeGuide`, `home.card.badge`
- api-docs `checkIn` 사용처 갱신

## 검증

- tsc·eslint·prettier 클린. 상세 페이지(실 POI) 200 + 인증 섹션 렌더, 홈 플로팅 버튼 `aria-haspopup="dialog"`
- `exifr`: GPS 태그를 손으로 넣은 합성 JPEG 에서 위·경도 파싱 확인, EXIF 없는 JPEG 는 조용히 빈 값
- 실제 인증 → 트리거 → 배지 부여까지의 E2E 는 로그인 세션이 필요해 브라우저에서 확인 필요.
  서로 다른 계정 3개로 같은 POI 에 GPS 사진 인증을 올리면 `badges` 에 PET_VERIFIED 가 생긴다

### 4. 업로드 제약 완화 (같은 날 추가)

아이폰 기본 포맷 HEIC 가 막혀 있어 카메라 설정을 바꾸지 않으면 인증이 불가능했고, 최신 폰 원본 JPEG 는
5MB 를 넘긴다. 세 곳을 함께 풀었다 — 서로 같아야 한다.

- `lib/upload.ts`: 허용 MIME jpeg·png·webp → + heic·heif·gif·avif, 10MB. 브라우저가 MIME 을 비워 보내는
  경우(일부 안드로이드·HEIC)는 확장자로 보완(`resolveMime`). svg 는 저장형 XSS 라 계속 막는다
- `components/photo-upload.tsx`: 파일 선택 `accept="image/*,.heic,.heif"`
- `apps/api/prisma/migrations/0021_storage_pet_photos_formats`: 버킷 `allowed_mime_types`·`file_size_limit`.
  **운영 DB 에 `prisma migrate deploy` 로 적용 완료**
- `exifr` 는 HEIC 컨테이너의 EXIF 도 읽는다 (README 명시)

후기 사진으로 HEIC 를 올리면 Safari 외 브라우저에서는 이미지가 안 보일 수 있다. 방문 인증은 EXIF 만
쓰므로 영향 없음. 후기 쪽은 필요해지면 업로드 전 canvas 로 JPEG 변환을 붙인다.

## 남은 것 / 후속

- 카메라 시각(DateTimeOriginal)은 시간대가 없어 기기 로컬로 해석한다. 7일 창이라 오차 영향은 없다
- 후기 사진 HEIC 표시 호환(위 참고)
