# [frontend] 사진 업로드 인프라 + POI 후기 작성 폼

- **날짜**: 2026-09-01
- **브랜치**: `feature/photo-upload` (← `dev`)
- **담당**: 프론트엔드
- **상태**: 구현·검증 완료, dev 병합 대기

## 개요

리뷰·방문인증이 공용으로 쓸 사진 업로드 인프라(A방식: 브라우저 직접 업로드)와
POI 상세 후기 작성 폼(별점 + 텍스트 + 사진)을 추가. 백엔드 QA 브랜치의 간이 후기 폼과
중복되어, rebase 시 본 브랜치의 상위 호환 버전(사진 업로드 + 로그인 게이트)으로 대체.

## 커밋 (2)

| 커밋 | 내용 |
|---|---|
| 사진 업로드 유틸 + PhotoUpload | `lib/upload.ts`(supabaseAccessToken 직접 업로드, RLS 본인 폴더, jpeg·png·webp/5MB 검증) + `components/photo-upload.tsx`(썸네일 그리드·업로드 상태·max 제한) + `copy.upload` |
| POI 리뷰 작성 폼 (Step 4) | `components/poi/review-form.tsx` 별점(1~5)+텍스트(≤2000)+사진(≤8) → `createReview`. 비로그인 시 로그인 게이트. `/poi/[id]` 배선 |

## dev 병합 충돌 해소 (백엔드 QA 브랜치와 중복)

- `review-form.tsx`: 백엔드 간이 폼(사진 없음) → **본 브랜치 버전 채택** (사진 업로드·로그인 게이트 포함 상위 호환)
- `copy.ts`: 백엔드 북마크 키 유지 + 사용처 없어진 중첩 `reviewForm` 키 제거 + 본 브랜치 플랫 키 유지
- `poi/[id]/page.tsx`: 백엔드의 북마크·길찾기 버튼 구조 수용, 자동 병합으로 중복된 ReviewForm import/렌더 정리

## 검증

- `apps/web` tsc 클린, 변경 파일 eslint 클린
- `review-list` 사진 렌더 확인 → 업로드~노출 E2E 배선 완결
- CSP: `*.supabase.co` img-src·connect-src 기허용 — 추가 변경 없음

## 남은 것 / 후속

- 방문인증(Step 6)에서 PhotoUpload 재사용 예정
- 동의 UI(백엔드 QA #4 후속) — 별도 브랜치 `feature/consent-ui`로 진행
