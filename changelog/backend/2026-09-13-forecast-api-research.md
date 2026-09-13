# [backend] 관광지 집중률 30일 예측 API 조사 — 실제 스펙 · 우리 POI 와의 매핑 방법

- **날짜**: 2026-09-13
- **브랜치**: `feature/departure-address-input` (← `dev`)
- **담당**: 조사 (코드 변경 없음)
- **상태**: 조사 완료. **공공데이터포털 활용신청 대기** — 신청 후 시드 스크립트 작성

## 왜 조사했나

제안서·PRD 가 F2 의 "핵심 차별점·국내 최초" 로 내세운 **30일 예측 한적도**가 코드에 없다.
`poi_forecasts` 테이블, Edge 의 예측 조회, 카드의 "내일 같은 시간 · 이번 주 평균" 표시까지 만들어져
있지만 데이터를 넣는 경로가 없고, 지금까지 API 호출이 한 번도 성공한 적이 없었다.

## 1. API 는 존재한다 — 다만 이름이 틀렸다

| | PRD·제안서 표기 | 실제 |
|---|---|---|
| 서비스 ID | `TatsCnctrRtService` | **`TatsCnctrRateService`** |
| 오퍼레이션 | (미기재) | **`tatsCnctrRatedList`** (유일) |
| 엔드포인트 | — | `https://apis.data.go.kr/B551011/TatsCnctrRateService/tatsCnctrRatedList` |

- 공공데이터포털 목록: https://www.data.go.kr/data/15128555/openapi.do
  (한국관광공사 디지털인프라팀, 개발계정 **자동승인** 후 약 10분, 일 1,000건, 데이터 갱신 일 1회, 매뉴얼 v4.1 2026-05-19)
- KT 이동통신 데이터를 2018년부터 학습해 관광지별 **향후 30일** 집중률을 예측. 가장 붐비는 시기를 100 으로 본 상대값
- **현재 프로젝트 키로 호출하면 `SERVICE_KEY_IS_NOT_REGISTERED_ERROR`** — 활용신청을 하지 않았다.
  데이터랩·두루누비를 신청했던 것과 같은 절차. 같은 키로 바로 쓸 수 있다

### 요청 파라미터

| 이름 | 필수 | 내용 |
|---|---|---|
| `areaCd` | 필수 | 시도 **행정코드** (충남 = 44) |
| `signguCd` | 필수 | 시군구 행정코드 5자리 |
| `tAtsNm` | 선택 | 관광지명 |
| `numOfRows` `pageNo` `MobileOS` `MobileApp` `serviceKey` `_type` | 공통 | |

충남 시군구 코드(매뉴얼 동봉 코드표): 천안 동남구 44131 · 서북구 44133 · 공주 44150 · 보령 44180 · 아산 44200 ·
서산 44210 · 논산 44230 · 계룡 44250 · 당진 44270 · 금산 44710 · 부여 44760 · 서천 44770 · 청양 44790 · 홍성 44800 ·
예산 44810 · 태안 44825.
**천안은 44130(시)으로 물으면 응답이 없고 구 단위로만 답한다** (peakoff 실측). 우리 TourAPI 적재도 이미 두 구를 따로 부른다.

### 응답 항목

`tAtsNm`(관광지명) · `baseYmd`(기준일) · `cnctrRate`(집중률) · `areaCd` `areaNm` · `signguCd` `signguNm`.
**contentId 도 좌표도 없다.**

## 2. 우리 POI 와의 매핑 — 이름으로만 가능

`pois` 는 관광공사 contentId 를 키로 쓰는데 응답에 ID 가 없으므로 **관광지명(tAtsNm) ↔ pois.name** 으로 붙여야 한다.
같은 문제를 푼 프로젝트 둘의 코드를 확인했다.

- **stampTrip** (`scripts/trending-snapshot.mjs`): 관광지명으로 `KorService2/searchKeyword2` 를 검색해
  같은 시군구 주소 + contentTypeId 12/14/28/38 + 대표이미지 있는 첫 결과를 채택. 이름 변형 순서는
  괄호 제거 → 시도 접두사("충남 ") 제거 → "터·앞길·일원" 접미사 제거.
- **peakoff** (`analysis/national`): 전국 64시군구 표본 관광지 2,905곳(시군구당 약 45곳), 충남 표본은 30일치
  6,720건 ≈ 224곳. 원자료 0.3~100 전 구간, 장소 내 정규화가 아니라 **장소 간 절대 비교 가능**.
  "후보가 여럿이면 자동 확정하지 않는다" 원칙.

관광공사가 이 API 의 관광지명을 국문 관광정보 제목과 같은 표기로 내보내므로 정규화 비교로 대부분 붙는다.

### 우리 적용 설계

`pois` 에 이름·시군구·좌표가 이미 있어 stampTrip 처럼 검색 API 를 또 부를 필요가 없다.

1. 충남 시군구 16개(또는 서비스 4시 5코드)별로 목록 조회 → 시군구당 1콜, 30일 × 관광지 수 행
2. 행정코드 → 프로젝트 코드(33xxx) 변환은 `seed-datalab.ts` 의 `SIGUNGU_MAP` 재사용
3. 같은 시군구 안에서 정규화한 이름(공백·괄호·접두사 제거)이 **정확히 하나**의 POI 와 일치할 때만 매칭
4. `expected_score = 100 − cnctrRate` (혼잡 100 ↔ 한적 100 방향 반전) 로 `poi_forecasts` 에 30행 upsert
5. 매칭 안 된 POI 는 그 시군구 관광지들의 일별 평균을 폴백 — 지금 한적도가 시군구 단위인 것과 같은 입도
6. 일 1회 갱신 크론 (데이터가 매일 바뀐다)

기존 것과의 연결: Edge `fetchForecasts` 가 `poi_forecasts` 를 읽어 `hasForecastData` 를 세우고,
카드가 그때만 "내일 같은 시간 N · 이번 주 평균 N" 을 그린다. **시드 스크립트 하나만 만들면 끝**이다.

### 예상 커버리지

추천 후보 463곳 중 매장·펜션·캠핑장은 예측 대상이 아니라 폴백으로 간다. 독립기념관·현충사·해미읍성 같은
주요 관광지는 붙을 것으로 본다. 충남 4시로 약 170~200곳이 들어오고, 실제 매칭률은 **활용신청 후 첫 호출**에서
바로 측정된다.

## 조사 방법 (재현용)

- 엔드포인트명: data.go.kr 상세 페이지 HTML 안의 Swagger JSON(`host`, `paths`)에서 확인. 추측한 7개 이름은
  전부 `NO_OPENAPI_SERVICE_ERROR`
- 매뉴얼 zip: `https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=FILE_000000003643086&fileDetailSn=1`
  (활용매뉴얼 docx + 관광지_시군구_코드정보 xlsx)
- 데이터랩 웹사이트는 서버 렌더 HTML 이라 관광지 목록을 긁을 수 없었다

## 다음 할 일

1. 공공데이터포털에서 활용신청 (개발계정, 자동승인)
2. 첫 호출로 충남 4시 관광지 목록 확보 → `pois.name` 매칭률 측정
3. `apps/api/prisma/seed-forecast.ts` + 일별 크론 → 카드에 예측 라인 표시
4. PRD §13.1.4 · 제안서의 서비스명 `TatsCnctrRtService` → `TatsCnctrRateService` 정정
