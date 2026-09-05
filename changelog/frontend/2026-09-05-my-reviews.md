# [frontend] 마이펫타임 '내가 쓴 후기' 페이지

- **날짜**: 2026-09-05
- **브랜치**: `feature/my-reviews` (← `dev`) — PR #16 병합 완료
- **담당**: 프론트엔드
- **상태**: dev 병합 완료

## 개요

`/me`의 '내가 쓴 후기' 메뉴가 disabled placeholder(`href="#"`)로 남아 있어
후기를 작성해도 확인할 수 없던 문제. 라우트·조회 코드 자체가 없었음(미구현).
PRD §7.2 마이펫타임 "펫 프로필 / 다녀온 곳 / 후기" 명세 구현.

## 주요 변경

- `app/me/reviews/page.tsx` — 내 후기 목록: POI 링크·별점·작성일·본문·사진 썸네일
  + 상태 칩(신고 누적 숨김 `HIDDEN_REPORTED` / 운영 삭제 `REMOVED`) + 비로그인 게이트
- `lib/actions/reviews.ts` — `deleteReview` 추가: `deleteMany` where 에 본인 소유 조건 포함
  (타인 후기 id 로는 count 0 → 삭제 불가)
- `components/poi/review-delete-button.tsx` — confirm → 삭제 → refresh
- `/me` 메뉴 활성화 (`disabled` 제거, `/me/reviews` 연결)

## 검증

- tsc·eslint 클린, dev 서버 라우트 200
- 실제 작성 후기(호스티드 DB)로 목록 노출 확인

## 남은 것 / 후속

- 후기 수정(edit) 기능 — 현재는 삭제 후 재작성 (필요 시 후속)
