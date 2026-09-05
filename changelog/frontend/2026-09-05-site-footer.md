# [frontend] 전역 푸터 + 스티키 레이아웃 · 네이버 문구 정리

- **날짜**: 2026-09-05
- **브랜치**: `feature/site-footer` (← `dev`)
- **담당**: 프론트엔드
- **상태**: dev 병합 대기

## 주요 변경

- `components/site-footer.tsx` — 전역 푸터 신설: © 2026 댕로드 저작권 + 이용약관·
  개인정보처리방침 링크. 전 페이지 하단 노출
- `app/layout.tsx` — body `flex min-h-screen flex-col` + children 을 `flex-1` 블록
  래퍼로 감싸는 스티키 푸터 레이아웃. 래퍼 없이 flex 직결 시 `mx-auto` 페이지 main 이
  flexbox 스펙(가로 auto 마진 아이템은 stretch 안 됨)으로 shrink-to-fit 되어
  가로가 줄어드는 회귀가 있어 블록 컨텍스트 유지
- copy: 마이펫타임 비로그인 안내 "카카오·네이버" → "카카오·구글" (로그인 네이버
  숨김과 정합)

## 검증

- tsc·eslint 클린, 홈·추천·마이펫타임 200 + 가로 폭 회귀 해소 확인
