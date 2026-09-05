# [frontend] 회원탈퇴 UI·URL 개편 + 약관·방침 v1.2

- **날짜**: 2026-09-05
- **브랜치**: `feature/withdraw-legal-v1.2` (← `dev`)
- **담당**: 프론트엔드
- **상태**: dev 병합 대기

## 주요 변경

- **회원탈퇴 진입점** — 마이펫타임 하단(약관·방침 줄 오른쪽 끝)에 '회원탈퇴' 텍스트 링크.
  탈퇴 폼을 알림 설정에서 분리해 **전용 페이지**로 이동 (비로그인 시 로그인 리다이렉트)
- **URL 의미화** — `/me/settings` → `/me/notifications`, 탈퇴는 `/me/delete-account`.
  email-cta·revalidatePath·api-docs 등 참조 전부 갱신
- **버그 픽스** — 백엔드 탈퇴 폼(PR #47)의 `'use server'` 파일 상수 export 로
  `/me/settings` 가 500 나던 문제: `DELETE_CONFIRM_TEXT` 를 `lib/constants.ts` 로 이동
- **약관·개인정보처리방침 v1.2**
  - 회원 탈퇴 조항 신설 — 실제 파기 동작(PR #47·#50 분석)과 일치:
    신원·개인 데이터 즉시 삭제 / 후기·첨부 사진은 익명 유지(탈퇴 전 직접 삭제 가능) /
    동의 이력의 IP·기기 정보 30일 후 삭제 / 재가입 가능
  - 개발 용어 제거 (OAuth·EXIF·RLS·JWT·Rate Limit 등 → 일반 사용자 언어)
  - 문의처 taehunkim.builds@gmail.com, CONSENT_VERSIONS v1.2.0 (재동의 게이트 발동)
- 팀원 PR #50(파기 로직 교정)과 병합 — 방침 보관기간 조항을 새 정책 기준으로 해소

## 검증

- tsc·eslint 클린, /me·/me/notifications·/me/delete-account·약관·방침 200
- 옛 URL 참조 잔존 0건 확인
