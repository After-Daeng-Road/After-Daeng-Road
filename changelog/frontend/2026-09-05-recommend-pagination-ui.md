# [frontend] 추천 결과 페이지네이션 UI + 카드 다듬기

- **날짜**: 2026-09-05
- **브랜치**: `feature/recommend-pagination-ui` (← `dev`)
- **담당**: 프론트엔드
- **상태**: dev 병합 대기

## 개요

백엔드 PR #30(limit/offset/hasMore) 배선. 팀 합의 설계: 첫 검색 3곳(PRD §6.1) →
페이지네이션으로 10곳씩. 화면은 append 가 아니라 **페이지 교체** 방식.

## 주요 변경

- `home-recommend.tsx`
  - 첫 검색: limit 생략(서버 기본 3). 응답 hasMore·검색조건(lastInput) 상태 보관
  - 다음 페이지 로드: offset=현재개수, limit=min(10, 100-offset) — 서버 상한(offset+limit≤100) 경계 처리
  - **startAt·departure 는 첫 검색 값 재사용** (페이지 간 순위 안정 — PR #30 규칙)
  - sessionStorage 복원에 hasMore·검색조건 포함
- `recommend-results.tsx`
  - 페이저: 1페이지=3곳, 2페이지부터 10곳씩 화면 교체. 로드된 페이지는 캐시로 즉시 이동
  - 미로드 페이지 존재 표시: 점선 `…` 버튼 (누르면 다음 10곳 로드, 없어지면 끝)
  - 페이지 이동 시 결과 섹션 상단 스크롤, 새 검색 시 1페이지 리셋
- `recommend-card.tsx` — 호버 확대 105→110, 주소/(출처·운영시간) 줄바꿈, 랭킹 뱃지 06+ 패딩,
  운영시간 원문 HTML 태그 제거(`stripHtmlText`) — `<br>` 이 문자로 보이던 문제
- `lib/format.ts` — `stripHtmlText` (태그 제거 + 엔티티 복원)

## 검증

- tsc·eslint 클린, dev 서버 홈 200
- 경계: offset 93 에서 limit 7 로 잘라 요청 (400 방지)

## 추가 수정 (`feature/quietness-badge`)

- 결과 헤딩 오른쪽 "N곳 · 시각 기준" 카운터 삭제
- 카드 좌상단 뱃지: 랭킹 숫자 제거 → 한적도 상태 뱃지 (팀 결정 기준:
  50~60 한적 / 60~69 보통 / 나머지 복잡) + 신호등 색 점(초록/노랑/빨강).
  rank prop 정리

## 백엔드 전달 메모

- 응답에 `total`(조건 맞는 전체 개수) 추가 요청 — 지금은 hasMore 만 있어 전체 페이지 수를
  미리 못 그림 (현재는 `…` 버튼으로 대체). ranked.length 를 그대로 주면 됨
- `use_time_text` 적재 시 HTML 태그 정리 검토 (현재 FE 표시 시점에 제거 중)
