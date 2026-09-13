# [frontend] 산책로 경로 미리보기 — DB 좌표를 이어 그린 코스 라인

- **날짜**: 2026-09-13
- **브랜치**: `feature/departure-address-input` (← `dev`, 출발지 드롭다운 작업과 같은 브랜치)
- **담당**: 프론트엔드
- **상태**: 구현·검증 완료, 커밋 대기

## 개요

산책로 카드의 "카카오 길찾기"가 코스 시작점에 핀 하나만 찍었다. 카카오 링크(`map.kakao.com/link/to`)는
목적지 한 점만 받는 규격이라 경로를 그릴 방법이 없다. 그런데 DB 에는 두루누비 GPX 에서 뽑은
경로가 16코스 전부 들어 있다(`durunubi_courses.path_geojson`, 코스당 91~101점 LineString).

그래서 길찾기는 그대로 두고 옆에 **[미리보기]** 를 붙였다. 누르면 **같은 카드 박스 안에**
경로 면이 덮이며 DB 좌표를 이어 코스 라인을 보여준다. 모달·회색 배경 스크림은 쓰지 않는다 —
카드 크기·라운드·보더가 그대로라 목록 레이아웃이 흔들리지 않는다.

## 주요 변경

- `components/trails/trail-card.tsx` (신규, 클라이언트) — 카드 마크업을 page 에서 옮겨 오고
  정보 면 / 경로 면 토글을 담당. 경로 면은 `absolute inset-0` + 같은 패딩이라 카드와 규격이 같고,
  정보 면은 `invisible` 로 남겨 카드 높이를 유지한다. Esc·닫기 버튼으로 복귀.
  `NEXT_PUBLIC_KAKAO_JS_KEY` 유무로 분기: 있으면 카카오맵, 없으면 SVG 스케치. 키를 넣는 순간
  지도 버전으로 바뀌고 코드 변경은 없다
- `components/trails/kakao-route-map.tsx` — `react-kakao-maps-sdk`(설치만 되어 있던 것) 첫 사용.
  Polyline(브랜드 살몬) + 출발·도착 마커, `setBounds` 로 코스 전체가 한 화면에. `next/dynamic` 으로
  모달을 열 때만 받아 목록 초기 번들에서 제외
- `components/trails/route-sketch.tsx` — 타일 없는 SVG 폴백. 위도에 따른 경도 축척 차이를
  `cos(lat)` 로 보정해 형태가 찌그러지지 않게 하고, 비율을 보존해 뷰박스에 맞춘다. 격자 배경 +
  출발(세이지)·도착(로즈) 점
- `app/trails/page.tsx` — 카드 렌더를 `TrailCard` 로 위임. `pathGeoJson` 조회 + 런타임 형식
  검증(`toPoints`) 후 주입. 형식이 어긋나면 미리보기 버튼만 빠지고 카드는 그대로
- `globals.d.ts` — `kakao.maps.d.ts` 전역 타입 참조 (SDK 의 peer 타입)
- `next.config.mjs` — CSP `img-src` 에 `https://*.daumcdn.net` (카카오맵 타일)
- `lib/copy.ts` — `trails.preview*`, `start`, `end`, `pointCount`, `mapLoadError`

## 검증

- `apps/web` tsc·eslint·prettier 클린, `/trails` 200 + 미리보기 버튼 16개 렌더
- 스케치 투영은 실제 DB 좌표(서해랑길 64-5, 98점)로 SVG → PNG 렌더해 형태 확인
- 카카오맵 버전은 JS 키가 로컬에 없어 미확인 — 키 등록 후 타일 로드(CSP)·bounds 확인 필요

## 남은 것 / 후속

- `NEXT_PUBLIC_KAKAO_JS_KEY` 등록 (카카오 디벨로퍼스 → JavaScript 키, 플랫폼에 localhost:3000 과
  배포 도메인 등록). 등록 후 한 번 열어 타일이 CSP 에 막히지 않는지 확인
- 추천 카드의 두루누비 코스에도 같은 미리보기를 붙일 수 있다 (`RoutePreview` 재사용, 추천 응답에
  경로 좌표는 아직 없음 — 필요 시 POI 상세에서 조회)
