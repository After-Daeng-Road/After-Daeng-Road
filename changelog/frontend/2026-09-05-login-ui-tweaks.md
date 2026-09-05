# [frontend] 로그인 UI 조정 — 네이버 버튼 숨김 · 구글 버튼 다크모드

- **날짜**: 2026-09-05
- **브랜치**: `feature/login-ui-tweaks` (← `dev`)
- **담당**: 프론트엔드
- **상태**: dev 병합 대기

## 주요 변경

- **네이버 로그인 버튼 UI에서만 숨김** — 로그인 페이지 폼 제거.
  `auth.config.ts` 프로바이더 설정·env 는 유지 (재노출 시 폼만 복원, 위치에 주석)
- **구글 버튼 다크모드** — `dark:bg-white dark:text-black` (보더 제거, 호버 white/90).
  라이트 모드는 기존 그대로

## 검증

- tsc·eslint 클린, /login 200
