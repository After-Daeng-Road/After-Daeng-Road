# [backend] 추천 실데이터 전환 · 운영시간 반영 · 성능 병목 제거

- **날짜**: 2026-09-05
- **브랜치**: `feature/pet-api-realdata`(PR #26) · `feature/perf-region-queries`(PR #27) — 병합 완료
  / `feature/poi-opening-hours` — 작업 중
- **담당**: 백엔드
- **상태**: PR #26·#27 dev 병합 완료 + Edge Function 배포 완료. 운영시간 브랜치는 커밋 대기

## 개요

"지금 추천받기" 결과가 **전부 데모 시드**였던 문제에서 출발해, 실데이터 전환 →
추천 로직 결함 수정 → 운영시간 반영 → 성능 병목 제거까지 이어진 하루치 작업.
중간에 OAuth 500 과 시간대 버그를 별도로 발견해 각각 규명·수정했다.

---

## 1. 추천 목데이터 → 실데이터 (PR #26)

### 문제

추천 응답의 `imageUrl` 이 전부 null 이었고, 주소가 "충남 서산시 시드 5" 형태였다.
실데이터 950건의 `pet_allowed` 가 **전부 false** 여서, 펫 동반 가능 POI 를 먼저 뽑는
추천 로직상 실데이터가 후보에 오르지 못하고 데모 시드 16건이 결과를 100% 점유했다.

### 원인

선행 작업(`docs/superpowers/specs/2026-08-29-recommend-realdata-design.md`)은 전용 서비스를
`KorPetTourService/detailPetTour` 로 시도해 404 를 받고 "전용 서비스 없음" 으로 판단,
일반 관광정보(`KorService2/detailPetTour2`)로 우회했다.

실제 경로는 **`KorPetTourService2`** — 서비스명 끝에 `2` 가 붙는다
(공공데이터포털 15135102, 현재 키로 활용신청 완료 상태).

우회 방식은 950건을 건별로 되물어야 해서 일일한도(1000)를 초과했고,
`client.ts` 의 `catch` 가 실패를 삼켜 전부 `petAllowed=false` 로 저장했다.

> 직접 증거: 올리브영 천안터미널점(contentId 2908117)은 API 가 "전구역 동반가능" 을
> 반환하는데 DB 는 false. 서산 펫 POI 9건 전부 동일.

### 변경

- **`prisma/tourapi/pet-client.ts`** (신규) — `KorPetTourService2` 전용 클라이언트.
  **실패를 삼키지 않는다**: 429/5xx 는 throw, 정상 응답의 빈 `items` 만 null.
- **`prisma/tourapi/transform.ts`** — 응답 정제 3종 + 단위테스트
  (`parseHomepage` 앵커태그/순수URL/스킴없는주소, `cleanOverview` HTML 제거,
  `mergeImageUrls` http→https 정규화 후 중복 제거)
- **`prisma/seed-pet-realdata.ts`** (신규) — 충남 4시 83건 백필. 호출량 254회(한도의 1/4)
- **`prisma/seed.ts`** — POI 생성부 제거(267→158줄). DB 의 `USER_UGC` POI 20건 삭제
  (연결된 리뷰 2·배지 12·북마크 3 동반 삭제 — 전부 데모 POI 소속)

전용 서비스 목록에 있다는 것 자체가 "펫 동반 가능" 이라 건별로 되물을 필요가 없다.
contentId 체계를 일반 서비스와 공유하므로 기존 950건에 플래그·상세만 덮어썼다.

### 추천 로직에서 함께 드러난 결함 3건

| 문제 | 증상 | 수정 |
|---|---|---|
| 거리 정렬 부재 | 박스 쿼리는 순서 보장이 없는데 limit 을 바로 걸어 반경 내 아무 30건이나 잡힘. 서산 출발 시 예산 내 후보 1건(72.9km) | 풀(300) 조회 후 haversine 정렬해 절단 |
| 야외 판정을 `type` 으로 | transform 이 쇼핑(38)·문화시설(14)·축제(15)를 모두 ATTRACTION 으로 뭉갬 → 야외 568건 중 192건이 실내/기간한정 | `contentTypeId` 로 관광지(12)·레포츠(28)만. 여행코스(25)는 24건 중 23건이 주소 없고 이름이 코스 설명문이라 제외 |
| 펫 무조건 우선 정렬 | 펫 등록 83곳 중 71곳이 올리브영·하이마트 등 체인 매장. 시내라 거리 점수도 유리해 상위 독식 | 쇼핑(38)은 추천에서 제외. 남은 펫 등록은 `PET_BONUS=0.1` 가산점으로 경쟁 (PRD §12.2 가중치 불변, 총점에 가산) |

야외 후보는 조건부 fallback 이 아니라 **항상 함께 조회**한다. 펫 정원을 절반으로 제한해
쇼핑 편중 지역에서도 야외가 후보에 든다 (천안은 펫 비쇼핑 0건).
두루누비 미연동인데 TRAIL 에 '두루누비 코스' 라벨이 붙던 것도 정정.

### 결과

| 항목 | 이전 | 이후 |
|---|---|---|
| 펫 동반 가능 실데이터 | 0건 | 83건 |
| 데모 시드 POI | 20건 | 0건 |
| 소개글 / 홈페이지 | 0 / 0 | 83 / 75 |

**충남 4시 펫 POI**: 공주 6(관광지 5) · 천안 48(전부 쇼핑) · 아산 20(관광지 5) · 서산 9(관광지 2)
전국 9,684건 중 쇼핑이 8,647건(89%). 음식점·카페는 전국 72건뿐이고 **충남은 0건**
(강원 29 / 경기 16). 카페 추천은 이 API 로 충남에서 불가능하다.

---

## 2. 운영시간 반영 + 시간대 버그 (작업 중 브랜치)

### 배경

한적도는 공개 API 에 시간대 데이터가 없어 규칙에 의존할 수밖에 없지만,
"도착했을 때 문이 열려 있는가" 는 `detailIntro2` 로 실데이터 판정이 가능하다.
기존 추천은 운영시간을 전혀 보지 않아 밤 9시에 5시 마감인 곳을 추천할 수 있었다.

### 변경

- **스키마**: `pois` 에 `use_time_text` · `rest_date_text` · `parking_text` · `info_center`
  (원문 보존) + `open_from` · `open_to` (파싱값) 추가 — 마이그레이션 `0013_poi_opening_hours`
- **`transform.ts`**: `parseUseTime`(상시개방 → 0~24 / `HH:MM~HH:MM` 파싱 / 안내문은 null),
  `isOpenAtHour`(자정 넘김 지원, 정보 없으면 true), `pickIntroFields`
  (타입별 필드명이 다름: 12 `usetime` / 28 `usetimeleports` / 38 `opentime` → 후보 키 순회)
- **`prisma/seed-poi-hours.ts`** (신규) — 관광지·레포츠 378건 백필. 멱등(이미 채운 건 건너뜀)
- **추천**: 도착 시각(출발 + ETA)에 닫혀 있으면 후보에서 제외. 응답에 `openHoursText` 추가
- **카드 UI**: 주소·출처 옆에 운영시간 원문 표시

백필 결과: 대상 378 / 저장 306 / 시각 파싱 260 / 응답 비어있음 72.
파싱 불가("기상여건에 따라 통제 되므로…")는 null 로 두어 시간 판단에서 제외 —
정보가 없다는 이유로 후보에서 탈락시키지 않는다.

### 시간대 버그 (별건, 함께 수정)

첫 배포 후 검증에서 **밤 8시에 `08:00~17:00` 인 곳이 그대로 노출**됐다.

Deno Edge 런타임은 UTC 로 실행되는데 코드가 `Date#getHours()` 를 그대로 썼다.
밤 8시 KST = 11시 UTC → 영업 중으로 판정. 반대로 오전 10시 KST = 01시 UTC → 닫힘 판정.

운영시간만의 문제가 아니었다. **한적도 조회의 `weekday`·`hourSlot` 도 같은 함수를 써서
9시간 어긋난 값으로 조회하고 있었다** (금요일 저녁 요청 → 금요일 오전 데이터).

`toKst` / `kstHour` / `kstWeekday` / `kstDateStr` 헬퍼를 추가해 관련 6곳을 모두 환산.

### 검증 (서산 출발 3시간)

| 출발 시각 | 1순위 |
|---|---|
| 오전 10시 | 서산 유기방가옥 (08:00~17:00) |
| 오후 4시 | 서산 유기방가옥 (08:00~17:00) |
| 오후 6시 | 서산 동문동 성당 (유기방가옥 제외됨) |
| 밤 8시 | 서산 동문동 성당 |

### 홈 화면 데모 제거 (같은 브랜치)

`lib/constants.ts` 의 `DEMO_RECOMMENDATIONS` 3건이 홈 초기값이라 검색 전에
"서산 해미읍성 둘레길" 같은 가짜 장소가 실데이터처럼 보였다.
(코드 주석에도 "실데이터 연동 시 제거하고 초기값 null 로" 라고 적혀 있었음)
초기값을 null 로 바꿔 검색 전에는 결과 섹션이 렌더되지 않는다.

`lib/types/recommendation.ts` 도 실제 응답과 어긋나 있어 동기화
(`sourceLabel` 값 불일치, `petAllowed` 누락, `openHoursText` 추가).

---

## 3. 성능 병목 제거 (PR #27)

### 측정

배포 사이트 실측. 병목은 DB 가 아니었다 — DB 를 전혀 쓰지 않는 `/legal/terms` 조차 0.58s.

| 경로 | 이전 TTFB | 이후 TTFB |
|---|---|---|
| `/api-docs` | 1.28s | 0.17s |
| `/legal/terms` | 0.58s | 0.19s |
| `/poi/[id]` | 0.37~0.51s | 0.38s |
| `/` | 0.46s | 0.45s |

### 원인과 수정

1. **서버 함수가 미국에서 실행** — 응답 헤더 `x-vercel-id: icn1::iad1`.
   엣지는 서울, 함수는 워싱턴, DB(Supabase)는 서울. 요청마다 태평양 왕복.
   → `apps/web/vercel.json` 에 `regions: ["icn1"]` 추가
2. **미들웨어가 전 경로에 걸려 CDN 캐시 무효화** — `x-nextjs-prerender: 1` 인데
   `cache-control: max-age=0`, `x-vercel-cache: MISS`. 프리렌더해두고도 매 요청 오리진 경유.
   → `auth.config.ts` 의 protectedPaths 와 동일하게 `/me`, `/admin` 으로 한정
3. **상세 페이지 쿼리 직렬** — `getPoiDetail` 내부 3개 + `isBookmarked` 까지 왕복 4회 직렬.
   → `Promise.all` 로 묶음. 로컬 실측 145ms → 49ms
4. **Supabase 클라이언트가 상세 페이지 초기 번들에 포함** —
   `PhotoUpload` → `lib/upload` → `@supabase/supabase-js`. → `next/dynamic` 분리

| 번들 | 이전 | 이후 |
|---|---|---|
| `/poi/[id]` | 71.8 kB | 8.7 kB |
| First Load JS | 181 kB | 118 kB |

### 미해결

미들웨어 수정은 반영됐으나(캐시 HIT 전환 확인) **리전 변경은 적용되지 않았다** —
배포 후에도 `x-vercel-id` 가 여전히 `icn1::iad1`. `vercel.json` 을 Vercel 이 읽지 않는 것으로 보인다.
프로젝트 Root Directory 설정 확인 필요. 대시보드 Settings → Functions → Function Region 을
Seoul 로 직접 지정하는 편이 확실하다. 적용되면 동적 페이지도 0.35s → 0.15s 안팎 예상.

---

## 4. 배포 환경 OAuth 500 — 원인 규명 (코드 변경 없음)

### 증상

배포 환경에서 구글 로그인 클릭 시 `Server error / There is a problem with the server configuration.`
로컬은 정상.

### 진단

Auth.js 는 프로덕션에서 상세를 감추므로(`error=Configuration`) 엔드포인트를 직접 호출해 좁혔다.

| 경로 | 상태 |
|---|---|
| `/`, `/login` | 200 |
| `/api/recommend` | 401 (`auth()` 호출 성공 — 세션 없음) |
| `/api/auth/csrf` | **500** |
| `/api/auth/providers` · `/api/auth/session` | **500** |

`/api/auth/csrf` 는 구글도 DB 도 쓰지 않는다. 그게 500 이면 Auth.js 초기화 단계에서 막힌 것이며,
구글만의 문제가 아니라 카카오·네이버도 동일하다.

`node_modules/@auth/core/lib/utils/assert.js` 의 검사 순서:

```js
if (!options.trustHost) return new UntrustedHost(...)
if (!options.secret?.length) return new MissingSecret("Please define a `secret`")
```

- `trustHost` 는 `auth.config.ts:54` 에 `true` 하드코딩 → 배제
- **`clientId` 검사는 존재하지 않는다** → 구글 자격증명 누락은 원인이 아님

→ **Vercel 에 `AUTH_SECRET` 미등록**. 로컬 `.env.local` 에는 있어 로컬만 동작.

### 조치 (레포 외 — 대시보드)

Vercel → Settings → Environment Variables 에 `AUTH_SECRET` 추가(Production·Preview),
값은 로컬과 동일하게 쓰거나 `openssl rand -base64 32` 로 생성, 재배포.

---

## 5. 한적도 실데이터화 — 조사만 (미착수)

### 서비스 경로 정정

PRD §13.1.3 의 `TourCntStatsService` 는 존재하지 않는다(`NO_OPENAPI_SERVICE_ERROR`).
실제 경로는 **`DataLabService`** (공공데이터포털 15101972 "한국관광공사_빅데이터_지역별 방문자수_GW").

### 활용신청 필요

| 서비스 | 경로 | 응답 |
|---|---|---|
| 지역별 방문자수 | `B551011/DataLabService` | 403 `SERVICE_KEY_IS_NOT_REGISTERED` |
| 두루누비 | `B551011/Durunubi` | 403 `SERVICE_KEY_IS_NOT_REGISTERED` |

- 방문자수: https://www.data.go.kr/data/15101972/openapi.do
- 두루누비: https://www.data.go.kr/data/15101974/openapi.do (코리아둘레길 284개 코스)

### 시간대 데이터는 공개 API 에 없다

`DataLabService` 응답 필드: `baseYmd`, `areaCode`, `signguCode`, `daywkDivCd`(요일구분),
`touDivCd`(관광객구분), `touNum`(관광객수). **시간대 필드 없음.**
지역별 관광 자원 수요(`AreaTarResDemService`)·두루누비도 동일.
서울시 실시간 도시데이터에는 시간대가 있으나 서울 전용.

현재 `quietness_scores` 는 (시군구, 요일, 시간대) 구조라 **요일까지만 실데이터로 채울 수 있다**.

### 현재 한적도의 실체

`prisma/seed.ts` 가 생성한 140행. 평일 18시 55점 / 주말 70점 / 그 외 80점을 기준으로
시군구·요일·시각 조합의 나머지 연산으로 ±5점 흔든 값이다. 출처 라벨만 `DATABANK_VISITOR`.
`poi_id` 가 전부 null 이라 시군구 단위로만 존재하며, 같은 시의 모든 장소가 같은 점수를 받는다.
(추천 함수가 POI id 해시로 ±8 편차를 얹어 카드마다 달라 보이게 하고 있다)

### 방향

- **요일별**: 신청 후 `DataLabService` 실데이터로 교체 가능. 우리 서비스 사용자 데이터가
  아니라 관광공사가 KT 통신 데이터로 집계해 공개하는 통계라 이용자 수와 무관하게 쓸 수 있다.
- **시간대**: 공개 데이터가 없다. 규칙 기반 유지하되, 요일별 실데이터를 바탕에 깔고
  시간대는 명시적 규칙으로 조정해 근거를 설명할 수 있게 한다.
  UGC(방문 검증 시각) 축적은 서비스 운영 이후의 선택지 — 공모전 시점에는 표본이 없다.

---

## 남은 것 / 후속

| 항목 | 상태 |
|---|---|
| Vercel `AUTH_SECRET` 등록 | 대시보드 작업 필요 |
| Vercel Function Region → Seoul | `vercel.json` 미적용, 대시보드 지정 필요 |
| 데이터랩·두루누비 활용신청 | 공공데이터포털 신청 필요 |
| 배지 0건 | 웰니스/생태 플래그가 실데이터에 없음. PRD §13.1.8 전용 API 필요 |
| 충남 펫 카페·음식점 0건 | 원본 데이터에 없음. 별도 소스 또는 UGC |
| 펫 정책 텍스트 12/83건 | 매장은 API 가 `acmpyTypeCd` 만 주고 나머지 빈 값 |
| `time-slider-recommender` 725줄 | 프로젝트 기준(600줄) 초과. 후보조회·ETA·한적도·점수로 분리 여지 |
| `petTourSyncList2` 증분 동기화 | 미사용 |
