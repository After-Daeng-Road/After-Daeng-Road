# [frontend] 홈 인트로 영상 스플래시

- **날짜**: 2026-09-05
- **브랜치**: `feature/intro-splash` (← `dev`)
- **담당**: 프론트엔드
- **상태**: dev 병합 완료

## 개요

홈 진입 시 브랜드 인트로 영상(31초, 스톱모션)을 풀스크린으로 재생하고
종료/건너뛰기 시 페이드아웃 → 메인 노출. 메인은 오버레이 아래에 이미 렌더되므로
LCP·SEO 영향 없음.

## 주요 변경

- `components/intro-splash.tsx`
  - **소리 재생 정책**: 소리 켠 자동재생을 먼저 시도 → 브라우저 차단 시 '입장하기'
    버튼 노출 (클릭 = 사용자 제스처 → 소리 합법 재생). 브라우저 정책상 무조건
    소리 자동재생 강제는 불가능해 이 방식이 최선.
  - **노출 정책**: 매 진입 표시. '오늘 하루 보지 않기' 체크 → localStorage
    (`daeng:intro-hide-date` = YYYY-MM-DD) 로 당일 숨김. '건너뛰기' 상시 제공.
  - 표시 중 스크롤 잠금, 종료/스킵 시 400ms 페이드아웃.
- `public/intro/` — 원본 23.7MB(1080p 6Mbps) → **6.5MB**(CRF27, faststart) 재인코딩
  + 포스터 프레임. faststart 라 다운로드 중 즉시 재생 시작.
- 홈(`app/page.tsx`) 배선, `copy.intro`

## 검증

- tsc·eslint 클린, dev 서버 홈 200 + 영상 200(6.8MB) 서빙 확인
- CSP: media-src 미정의 → default-src 'self' 적용, 자체 호스팅이라 변경 불필요

## 남은 것 / 후속

- 모바일 세로 화면에서 object-contain 여백 확인 (필요 시 모바일 전용 크롭 검토)
- 원본 파일 보관 위치 결정 (현재 ~/Downloads/final_bgm2.mp4, 레포엔 압축본만)
