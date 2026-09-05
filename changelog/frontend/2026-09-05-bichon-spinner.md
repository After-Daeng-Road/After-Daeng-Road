# [frontend] 비숑 로딩 스피너 · 브랜드 마크 교체 · 텍스트 토큰 통일

- **날짜**: 2026-09-05
- **브랜치**: `feature/bichon-spinner` (← `dev`)
- **담당**: 프론트엔드
- **상태**: dev 병합 대기

## 개요

API 로딩 구간(로그인·추천·페이지네이션)에 커스텀 비숑 달리기 스피너 도입.
에셋은 태헌 님이 직접 제작한 8프레임 인라인 SVG React 컴포넌트 (외부 의존성 0).

## 주요 변경

- `components/ui/bichon/` — BichonSpinner + 8프레임 패스 데이터 (제작 에셋 반입, prettier 정리)
- `components/ui/loading-overlay.tsx` — **전면 로딩 오버레이**: 스크림 + 화면 정중앙
  흰 원판(테마 무관) 위 검정 라인 비숑 100px. 아트워크 치우침 보정(translate 2%,-6%)
- `components/ui/spinner.tsx` — 공용 소형 스피너 (currentColor, 버튼 내 사용)
- `components/ui/submit-button.tsx` — 서버 액션 폼 제출 버튼: pending 시 오버레이 + 중복 제출 방지
- 배선: 로그인(구글·카카오), 추천받기(isPending), 페이지네이션 …/›(loadingMore)
- `components/brand-mark.tsx` — 페이지 내 로고를 파비콘 bg-image → **비숑 정적 1프레임 SVG**로 교체
  (라이트=검정/다크=흰색 고정, viewBox 치우침 -22u 보정, 탭 파비콘은 유지).
  헤더 40px·드로어 36px 확대, 로그인은 아이콘 80px 위 + 워드마크 아래 세로 중앙 배치
- 텍스트 토큰: 헤더 내비·로그인 태그라인을 `text-muted` → `text-faint`로 — 약관 문구와
  3곳 통일 (faint 값 조정: 라이트 #5a5a5a / 다크 #d8d8d8)

## 검증

- tsc·eslint 클린, 홈·로그인 200
- 아트워크 바운딩박스 계산으로 중심 보정값 산출 (8프레임 전체 기준)

## 남은 것 / 후속

- 스피너 프레임 데이터 소스 ~160KB (gzip 후 축소) — 번들 이슈 시 지연 로딩 검토
