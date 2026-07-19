# 댕로드 추천 실데이터화 (Phase 1+2) 설계

- 작성일: 2026-07-19
- 브랜치: `feature/backend-recommend-realdata`
- 관련 PRD: §12(추천), §13(외부데이터/TourAPI), §10(ORM 운용)
- 상태: 승인됨 (구현 계획 대기)

## 0. 배경 / 문제

메인 화면 "지금 추천받기" 탭 시 **추천 API 503**(빈 결과) 발생. 근본 원인은 (1) Supabase Edge 함수 미서빙, (2) 레이트리밋/ETA 외부 의존성이 키 없을 때 크래시, (3) 추천 풀이 시드 20개뿐이라 실데이터 부재. 목표는 **실데이터(한국관광공사 TourAPI) 기반**으로 추천이 실제 동작하고, 결과가 비지 않게 하는 것.

- 필수 데이터 소스: **한국관광공사 OpenAPI(TourAPI)** — 공모전 요건 + 펫 전용 데이터 보유
- 선택: 카카오 Open API(지오코딩·ETA) — 없으면 폴백
- 범위: Phase 1(추천 동작화) + Phase 2(실데이터). **지도는 확장 시 별도.**

## 1. 실데이터 검증 결과 (2026-07-19, 프로브 8회)

`TOUR_API_SERVICE_KEY`(data.go.kr Decoding 키) 발급·검증 완료. 실응답으로 아래를 확정:

### 1.1 엔드포인트 / 파라미터 (기존 코드가 틀렸음)
- **POI 목록**: `GET https://apis.data.go.kr/B551011/KorService2/areaBasedList2`
  - `areaCode`/`sigunguCode`는 **폐기(삭제예정)** → 사용 시 **HTTP 403 Forbidden**
  - 신 파라미터: **`lDongRegnCd`(법정동 시도)** + **`lDongSignguCd`(법정동 시군구, 뒤 3자리)**
- **펫 오버레이**: `GET .../KorService2/detailPetTour2?contentId=...`
  - 기존 코드의 `KorPetTourService/detailPetTour`는 **404(존재하지 않음)**
  - `serviceKey`는 Decoding 키 + `URLSearchParams` 자동 인코딩으로 정상 동작

### 1.2 충남 4시 법정동 매핑 & 실 데이터량
| 시 | 조회(lDongRegnCd/lDongSignguCd) | 실 POI 수 | 저장 sigunguCode(구 코드) |
|---|---|---|---|
| 공주 | 44 / 150 | 235 | 33020 |
| 천안 | 44 / **131 + 133** (동남구·서북구) | 190+138=328 | 33040 |
| 아산 | 44 / 200 | 231 | 33050 |
| 서산 | 44 / 210 | 156 | 33150 |
| 합계 | | **≈ 950** | |

> 천안은 구(동남구 131 / 서북구 133)로 분할돼 부모코드 130은 2건뿐. 반드시 두 구를 조회.
> DB `sigunguCode`·quietness 시드는 **구 코드(33xxx)** 기준이므로, 조회는 법정동으로 하되 **저장은 33xxx로 역매핑**(quietness join 유지).

### 1.3 펫 등록률 & 실 필드 (detailPetTour2)
- 샘플 100건 중 펫등록 8건 → **≈ 8% (충남 4시 ~75곳 펫동반 가능 추정)**
- 실 필드 (예: 유구색동수국정원, contentId=2736822):
  - `acmpyTypeCd` = "전구역 동반가능" (동반 **구역** — 전구역/실내/실외) → `petIndoor`/`petOutdoor` 파생
  - `acmpyPsblCpam` = "전 견종 동반 가능" (동반 가능 **견종**)
  - `relaAcdntRiskMtr` = "전 견종 동반 가능" (관련 위험/견종)
  - `acmpyNeedMtr` = "목줄 착용" (필요 준비물)
  - `etcAcmpyInfo` = "맹견 입마개 필수, 배변봉투 지참" → `petPolicyText`
- 기존 `parsePetSize(acmpyTypeCd)`(kg 정규식)는 무의미 → 재작성 필요

## 2. Phase 1 — 추천 "동작화"

1. **Edge 서빙 스크립트 수정**
   - 현행 `dev:api`는 cwd·`--env-file` 누락 → Edge 미서빙(503 원인)
   - `cd apps/api && supabase functions serve --no-verify-jwt --env-file <env>`
   - env 주입: `SB_JWT_SECRET`, `TOUR_API_SERVICE_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `KAKAO_REST_API_KEY`(선택), `UPSTASH_*`(선택)
2. **Rate Limit fail-open** (`time-slider-recommender`)
   - `UPSTASH_*` 미설정 시 크래시 대신 **레이트리밋 스킵**(개발). 값 있으면 정상 동작(30req/60s/user)
3. **ETA 폴백**
   - 카카오 모빌리티 키 없음/실패 → **haversine 거리 × 1.3 / 50km/h** 휴리스틱
   - 왕복 반경 의미(`시간/2`, PRD §12.2) 유지. 결과 노출에 지장 없음

## 3. Phase 2 — 실데이터 ETL (`tour-api-etl`)

### 3.1 버그 수정 (§1 근거)
1. 조회 파라미터: `areaCode/sigunguCode` → `lDongRegnCd=44` + `lDongSignguCd`(3자리)
2. 도시 설정: `{ name, lDongSignguCd[], storeSigunguCode }` 배열. 천안은 `[131,133] → 33040`
3. 펫 엔드포인트: `KorPetTourService/detailPetTour` → `KorService2/detailPetTour2`
4. 펫 필드 매핑 재작성:
   - `petIndoor` = `acmpyTypeCd`에 "실내"/"전구역" 포함
   - `petOutdoor` = `acmpyTypeCd`에 "실외"/"전구역" 포함
   - `petPolicyText` = `etcAcmpyInfo`(+ `acmpyNeedMtr` 병합 가능)
   - `petAllowed` = detailPetTour2 응답 존재 여부
   - `petSizeMaxKg` = `acmpyPsblCpam`/`relaAcdntRiskMtr`에서 kg 파싱(있으면), 없으면 null

### 3.2 C 하이브리드 적재
- `areaBasedList2`로 4시 ~950 POI upsert (`source='TOUR_API_KOR'`, source_id=contentid)
- 각 POI에 `detailPetTour2` 호출 → 데이터 있으면 `petAllowed=true` + 펫필드
- 초기 시드 1회 실행. detailPetTour2 ~950콜(일일한도 1000 내). **크론 증분 최적화는 범위 밖**

## 4. 추천 랭킹 — 펫 우선 + fallback (`time-slider-recommender`)

- 후보 = 출발지 반경(시간/2) 내 POI. 기존 랭킹(거리·ETA·한적도) **+ 펫 부스트**
- `petAllowed=true` 를 상위로 정렬/가중
- 펫 후보가 목표 개수 미만이면 → **야외 타입(PARK/TRAIL/ATTRACTION 야외)** 비펫 POI를 하위 fallback("한적한 산책지")로 채움 → **결과 비지 않음**
- 결과 아이템에 `petAllowed`(또는 sourceLabel="펫 동반 가능") 전달 → FE 뱃지

## 5. 데이터 모델

- **스키마 변경 없음.** `pois`의 petAllowed/petIndoor/petOutdoor/petPolicyText/sigunguCode/contentTypeId 등 기존 필드 사용
- 시드 POI(20)는 실데이터 upsert로 병합/대체 (source_id 기준 중복 방지)
- quietness(140행, sigunguCode 33xxx 기준)는 그대로 join

## 6. API 명세 최신화 (필수 산출물)

코드 변경에 맞춰 `apps/web/lib/api-docs/openapi.ts` 동기화:
- `/tour-api-etl` 설명: `areaBasedList2(법정동코드) + detailPetTour2`로 정정 (기존 `detailPetTour` 표기 오류)
- `Poi` 스키마: `petAllowed` 출처(TourAPI detailPetTour2), `sigunguCode` 법정동 매핑 주석
- `Recommendation`: **"펫 동반 가능"(petAllowed, TourAPI 데이터)** vs **PET_VERIFIED 뱃지(사용자 방문검증, 별개)** 구분 명시
- `/api/recommend` HTTP 계약(요청/응답 shape)은 **불변** — 내부 변경만
- 원칙: 이후 TourAPI/공공데이터 관련 코드가 바뀌면 **같은 커밋에서 명세도 갱신**

## 7. 에러 / 캐시 / RateLimit

- ETL: item 단위 try/catch + `tour_api_sync_logs` 기록 (기존 유지)
- ETA 캐시(Upstash 24h)는 키 있을 때만; 없으면 폴백 직행
- 추천 라우트: 세션 없으면 401(기존), Edge 실패 status 패스스루

## 8. 테스트 / 검증

- ETL 실행 후: `pois` ~950행, `petAllowed=true` ~75행, sigunguCode 4종(33020/40/50/150) 존재 확인
- 추천: 로그인 후 "지금 추천받기" → 리스트에 펫 우선 노출 + **빈 결과 없음** 확인
- 회귀: 프로브 스크립트(TourAPI 응답 형태) 재실행

## 9. 범위 밖 (후속)

지도 API(카카오맵), 실 ETA 상시(카카오 모빌리티), 한적도 실데이터(데이터랩), 두루누비 트레일, ETL 크론 증분 최적화, 프론트 미구현 액션(리뷰폼·체크인 등 — 팀원), 배포 env/도메인 콜백.

## 10. 완료 정의 (DoD)

- [ ] 로그인 상태에서 "지금 추천받기" → 충남 4시 실 POI 리스트(펫 우선, 빈결과 없음)
- [ ] `pois`에 실데이터 적재 + `petAllowed` 라벨링
- [ ] Edge 로컬 서빙 정상(503 해소), 키 없을 때 폴백 동작
- [ ] api-docs 최신화 반영
