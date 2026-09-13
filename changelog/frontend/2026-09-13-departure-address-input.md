# [frontend] 출발지 드롭다운 — 충남 4시 → 15개 시·군 전체

- **날짜**: 2026-09-13
- **브랜치**: `feature/departure-address-input` (← `dev`)
- **담당**: 프론트엔드
- **상태**: 구현·검증 완료, 커밋 대기

## 개요

출발지 드롭다운이 베타 서비스 4시(천안·아산·공주·서산)뿐이었다. 충남은 확정 지역이므로
15개 시·군 전체로 넓혔다. 주소·장소명 직접 입력(카카오 로컬 지오코딩)도 함께 만들었다가
"드롭다운만 있는 편이 깔끔하다"는 판단으로 걷어냈다 — 우편번호도 범위 밖.

**추천 API 계약은 그대로다.** `/api/recommend` 와 Edge 함수는 출발지를 좌표로 받으므로
드롭다운 항목이 늘어도 서버 변경이 없다.

## 주요 변경

- `lib/constants.ts` — `CHUNGNAM_SEED`(4시 Record) → `CHUNGNAM_CITIES`(15 시·군 배열,
  시청·군청 부근 좌표). 베타 4시를 앞에 두고 나머지는 가나다순. `DEFAULT_DEPARTURE` = 천안
- `components/recommend/recommend-form.tsx`
  - 드롭다운을 `CHUNGNAM_CITIES` 로 렌더
  - 현 위치로 정한 좌표는 도시 목록에 없다. 이전엔 select 의 value 가 어느 option 과도
    맞지 않아 첫 도시(천안)가 선택된 것처럼 보였다 → 비활성 옵션 "현 위치"를 앞에 끼워
    현재 상태를 그대로 보여준다

## 검증

- `apps/web` tsc·eslint·prettier 클린, 홈 SSR 에 15개 옵션 렌더 확인

## 남은 것 / 후속

- POI 데이터는 4시 기준이라 태안·금산 등 먼 시군에서 출발하면 반경 안 후보가 적을 수 있다.
  빈 결과 시 EmptyResult 의 "+1시간" 완화로 대응
