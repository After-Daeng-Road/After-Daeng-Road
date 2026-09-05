# [backend] 저장 실패 수정 · 두루누비 연동 · 한적도 정직화 · 크론 인증 · 회원 탈퇴

- **날짜**: 2026-09-05
- **브랜치**: `feature/edge-insert-fix` · `feature/durunubi-seed` · `feature/durunubi-chungnam-only` · `feature/recommend-trail-and-budget` · `feature/quietness-honesty` · `feature/cron-auth` · `feature/account-deletion` · `feature/deletion-policy-fix` · `feature/cron-vault-secrets` (← `dev`)
- **담당**: 백엔드
- **상태**: `0020` 을 제외한 전부 dev·main 병합 완료. `0020` 은 검증 중

## 개요

상용화 준비도 감사(11개 축, 에이전트 23개)에서 나온 차단 항목을 긴급도 순으로 처리했다.
감사 시점 커밋에서 레포가 49커밋 전진해 있어, 착수 전 16개 항목을 현재 코드 기준으로 전수 재검증한 뒤 진행했다.

작업 중 계획에 없던 결함이 여럿 드러났고 대부분 "있는 줄 알았는데 한 번도 동작한 적 없는" 유형이었다.

## PR (7)

| PR | 내용 |
|---|---|
| `#36` | Edge Function INSERT UUID 누락 수정 + 쓰기 오류 검사 |
| `#37` | 두루누비 코스 적재 + `durunubi_courses` 스키마 교정 |
| `#39` | 두루누비 적재 범위를 충남 16코스로 한정 |
| `#42` | 두루누비 추천 통합 + 시간 예산 왕복·체류 기준 재정의 |
| `#43` | 한적도 정직화 — 데이터랩 실측 적재 + 합성 편차 제거 + 라벨 교정 |
| `#45` | 크론 Edge Function 2종 공유 시크릿 가드 |
| `#47` · `#50` | 회원 탈퇴 + 파기 로직 교정 |

## 마이그레이션 (0014 ~ 0020)

| 번호 | 내용 |
|---|---|
| `0014` | `pois`·`recommendations`·`email_logs` 의 `id` 에 `gen_random_uuid()`, `pois.updated_at` 에 `now()` |
| `0015` | `durunubi_courses` 를 코스 단위 키(`crs_idx`)로 교정 |
| `0016` | `QuietnessSource` 에 `SYNTHETIC_BASELINE` 추가 |
| `0017` | pg_cron 호출에 `x-cron-secret` 헤더 주입 |
| `0018` | `users.deleted_at` + 파기 함수 |
| `0019` | 파기 함수 교정 — `DELETE FROM users` 제거 |
| `0020` | 크론·암호화 시크릿을 Supabase Vault 에서 읽도록 전환 |

## 항목별 결과

### 1. Edge Function 저장이 100% 실패하고 있었다 (`#36`)

`recommendations`·`email_logs`·`pois` 의 `id` 가 `UUID NOT NULL` 인데 컬럼 DEFAULT 가 없었다.
Prisma 의 `@default(uuid())`·`@updatedAt` 은 Prisma Client 가 채우는 클라이언트 기능이라 생성 SQL 에 반영되지 않는다.
CLAUDE.md 규칙대로 `supabase-js` 를 쓰는 Edge 경로에서는 `id` 가 NULL 이 되어 저장이 전부 실패했다.

드러나지 않은 이유는 `supabase-js` 가 실패 시 예외를 던지지 않고 `{ error }` 를 돌려주는데 아무도 검사하지 않았기 때문이다.

**파급**: 추천 이력 0건(`/recommendations` 항상 빈 화면), `email_logs` 0건으로 주 5회 발송 상한이 영구히 열림, ETL 이 매일 `status='ok'` 와 허구의 `count_added` 기록.

**조치**: 저장 3곳에 `crypto.randomUUID()` 명시, 쓰기 7곳에 `error` 검사, `0014` 로 DB 기본값 추가, `verify-recommend.ts` 에 영속화 단언 추가.

**검증**: 배포된 함수 상대로 `recommendations: 0 → 1` 확인. 0 이었다는 것이 그동안 한 건도 저장되지 않았다는 증거다.

### 2. 두루누비 연동 (`#37`, `#39`, `#42`)

공공데이터포털 활용신청 승인 후 실호출로 명세를 확정했다.

- 노선(`routeIdx`) 4개 / 코스(`crsIdx`) 142개. **`0001` 은 `route_idx` 에 UNIQUE 를 걸고 `crs_idx` 컬럼을 두지 않아 최대 4행만 저장되는 구조였다** → `0015` 로 교정
- `courseList` 에 좌표가 없다. `gpxpath` 로 GPX 를 받아 시작점 추출, 경로는 약 100 포인트로 솎아 저장(원본은 코스당 약 200KB)
- 적재 범위는 충남 16건(태안 6·서산 3·서천 3·보령 2·당진 2). 서비스 대상 4개 시 중 코스가 있는 곳은 서산뿐이다
- 두루누비 POI 는 `content_type_id` 가 없어 기존 후보 쿼리 두 갈래 어디에도 걸리지 않았다(`.in()` 은 NULL 을 매칭하지 않는다) → `source='DURUNUBI'` 갈래 추가

**PRD §6.6 의 "충남 코스 100개+ 시드" 는 달성 불가능하다.** 두루누비 전체가 142코스다. 문서 정합 작업에서 수정 필요.

### 3. 시간 예산이 편도 기준이었다 (`#42`)

`radiusKm` 과 `budgetMin` 이 모두 `timeHours / 2` 였다. 편도 ETA 만 시간의 절반과 비교해서,
3시간을 고른 사용자에게 **왕복 주행만 정확히 3시간인 곳이 통과**했고 카드에는 편도 90분만 표시됐다.

`oneWayBudgetMin(h) = max(15, (h*60 - 60)/2)` 로 단일화하고 반경·통과 판정을 같은 값에서 파생시켰다.
통과 조건은 왕복 이동 + 필요 체류 ≤ 슬라이더 시간이며, 두루누비 코스는 도보 소요 시간이 곧 필요 체류다.

| 편도 ETA (3h 기준) | 왕복 | 남는 시간 | 이전 | 현재 |
|---|---|---|---|---|
| 60분 | 120분 | 60분 | 통과 | 통과 |
| 75분 | 150분 | 30분 | 통과 | **탈락** |
| 90분 | 180분 | 0분 | 통과 | **탈락** |

반경도 3시간 기준 75km → 50km. 웹의 `radiusFromHours` 가 별도 하드코딩이라 슬라이더 캡션과 실제 반경이 달랐던 것도 함께 맞췄다.

### 4. 한적도 정직화 (`#43`)

네 겹의 문제가 있었다.

- **합성값에 실측 라벨**: `seed.ts` 가 `base(55/70/80) + (sigungu+weekday*7+hour)%15-5` 로 만든 값을 `source='DATABANK_VISITOR'` 로 저장. `sampleSize` 도 관측한 적 없는 100
- **런타임 해시 편차**: `computeQuietness` 가 `poi.id` 를 FNV-1a 해시해 ±8 을 더했다. 실측 가드가 `forecast`/`week` 에만 걸려 있어 **화면에 보이는 `now` 에는 항상 적용**됐다. 주석은 정반대로 적혀 있었다
- **라벨 기준 역전**: `50~60 한적 / 60~70 보통 / 나머지 복잡`. 실측을 넣으면 서산 평일 74점이 '복잡', 천안 토요일 51점이 '한적' 으로 표시된다
- **30일 예측이 오늘 값**: `poi_forecasts` 가 비어 있으면 현재 값을 복사해 내려주는데 화면은 "내일 같은 시간" 으로 표시했다

**실측 산출식** — 외지인 비율이 낮을수록 한적하다.

```
외지인비율 = 외지인 / (현지인 + 외지인)
한적도    = 100 - 외지인비율(%)
```

현지인 통행은 통근·거주라 관광 혼잡과 무관하고, 절대 방문자 수는 도시 크기에 지배된다(천안 32만 vs 공주 6만).

**2층 구조**: 요일·지역은 실측, 시간대는 추정(±10 이내 가중치). 데이터랩에 시간 축이 없다 — 제공 축은 일자·요일·시군구·방문자유형 넷뿐이다. 화면에 근거를 표기한다.

| 시군 | 요일 | 외지인비율 | 한적도 |
|---|---|---|---|
| 서산 | 화·수·목 | 25.9% | 74 |
| 아산 | 화·수·목 | 30.1% | 70 |
| 천안 | 월~목 | 38.1% | 62 |
| 공주 | 토 | 66.7% | 33 |

데이터랩은 약 60일 지연이라 오늘 날짜로 조회하면 0건이다. 지역 필터 파라미터가 없어 전국 805행을 받아 충남 4개 시를 거른다. 행정표준코드(44150)와 프로젝트 코드(33020) 두 체계를 매핑한다.

### 5. 크론 Edge Function 무인증 (`#45`)

`tour-api-etl` 과 `daily-recommend-email` 이 `verify_jwt = false` 이고 **두 핸들러 모두 요청 헤더를 검사하지 않았다.**
`daily-recommend-email` 은 요청 객체를 `_req` 로 무시해 메서드조차 보지 않았다.

프로젝트 ref 는 `NEXT_PUBLIC_SUPABASE_URL` 로 웹 번들에 공개되어 URL 추측이 쉽고, 두 함수 모두 `service_role` 로 RLS 를 우회해 쓴다.

`verify_jwt = true` 로는 방어가 안 된다 — anon 키도 유효한 JWT 이고 그 키 역시 번들에 공개되어 있다.
함수 안에서 `x-cron-secret` 을 직접 검증하며, 시크릿 미설정 시 통과가 아니라 거부한다(fail-closed).

### 6. 회원 탈퇴 (`#47`) 와 그 교정 (`#50`)

처리방침이 "회원 탈퇴 시 즉시 삭제(30일 보관 후 완전 파기)" 를 고지하고 있었으나 기능 자체가 0건이었다.

`#47` 의 초안은 30일 뒤 `DELETE FROM users` 를 했는데, **`users` 참조 FK 8개가 전부 `ON DELETE CASCADE`** 라 그 한 줄이 후기·사장님 답글·벤더 등록·북마크를 연쇄 삭제한다.
소프트 딜리트를 택한 이유를 30일 뒤에 스스로 무너뜨리는 설계였다. 코드 리뷰 지적으로 `#50` 에서 교정했다.

**최종 동작**

| 시점 | 처리 |
|---|---|
| 즉시 | 식별정보 무효화 — email·소셜 ID·닉네임·기준 주소/좌표 |
| 즉시 | 반려견·북마크·추천 이력(출발지 좌표)·방문 인증(EXIF 좌표) 삭제 |
| 즉시 | 방문 인증 사진 삭제 (후기 사진은 보존 — 지우면 `Review.photos` URL 이 살아 있는 채로 이미지만 깨진다) |
| 30일 후 | `user_consents` 의 `ip_address`·`user_agent` 만 제거. 동의 사실·약관 버전은 보존 |

행을 남겨도 되는 근거: 식별자를 비우면 남는 컬럼은 UUID·로케일·알림 설정·권한·타임스탬프뿐이라 개인을 식별하지 못한다.
후기는 남되 `review-list.tsx:55` 가 이미 `nickname || '익명'` 으로 렌더한다.

### 7. 크론이 한 번도 성공한 적 없었다 (`0020`, 검증 중)

`0004` 는 `ALTER DATABASE ... SET app.settings.*` 로 값을 주입하라고 안내했다.
**Supabase 는 `postgres` 롤에 커스텀 파라미터 설정 권한을 주지 않는다.**

```
ERROR: 42501: permission denied to set parameter "app.settings.cron_secret"
```

`cron.job_run_details` 실측 결과, HTTP 를 쓰는 두 잡이 등록 이후 매 실행 실패했다.

```
daily-recommend-email | failed | ERROR: unrecognized configuration parameter "app.settings.supabase_url"
```

`daily-recommend-email` 은 매분 스케줄이라 매분 실패를 쌓아 왔다. 순수 SQL 잡만 정상이었다.

같은 방식을 쓰는 `0005` 의 좌표 암호화도 키가 없어 `encrypt_coord` 가 늘 NULL 을 반환했다.
암호화 컬럼이 비어 있고 평문만 남다가 24시간 뒤 지워지는 상태였다 — 처리방침의 "암호화본 90일 보관" 이 성립하지 않는다.

**조치**: `0020` 이 `app_secret(name)` 헬퍼를 도입해 Vault 를 먼저 보고 `app.settings.*` 로 폴백한다.
크론 잡과 좌표 암호화 함수를 이 헬퍼 기반으로 재작성했다. `0004` 주석이 이미 "운영 시 supabase.vault 로 관리 권장" 이라 적어둔 방식이다.

## 배포 절차

```bash
cd apps/api
npx prisma migrate deploy
npx supabase secrets set CRON_SECRET=<값>
```

Supabase Dashboard → SQL Editor 에서 Vault 시크릿 생성 (값은 실제 값으로):

```sql
SELECT vault.create_secret('https://<ref>.supabase.co', 'supabase_url',         'pg_cron → Edge Function 호출 대상');
SELECT vault.create_secret('<service_role_key>',        'service_role_key',     'pg_cron → Edge Function 인증');
SELECT vault.create_secret('<cron_secret>',             'cron_secret',          'supabase secrets 와 동일 값');
SELECT vault.create_secret(encode(gen_random_bytes(32), 'base64'), 'coord_encryption_key', '출발지 좌표 대칭키');
```

시크릿 설정이 끝난 **뒤에만** 함수를 배포한다. 순서를 뒤집으면 무인증 구간이 생기고, `daily-recommend-email` 은 매분 스케줄이라 그 사이에 실제로 메일이 나갈 수 있다.

```bash
npx supabase functions deploy time-slider-recommender
npx supabase functions deploy tour-api-etl
npx supabase functions deploy daily-recommend-email
npm run seed:durunubi
npm run seed:datalab
```

## 검증

| 대상 | 방법 | 결과 |
|---|---|---|
| 저장 복구 | `verify:recommend` (배포 함수 대상) | `recommendations: 0 → 1` |
| 두루누비 | `seed:durunubi -- --dry` | 코스 16 · POI 16 · 좌표없음 0 · 실패 0 |
| 한적도 실측 | `seed:datalab -- --dry` | 56일 수집 · 140행 계산 |
| 시간 예산 | 수치 검증 | 3시간 기준 편도 90분 탈락 확인 |
| 크론 가드 | 로직 검증 | 미설정·헤더없음·오값·길이만같음 전부 거부 |

Edge Functions 는 `apps/api/tsconfig.json` 이 타입체크에서 제외해 정적 검증이 안 된다.
`deno check` 도 로컬에 Deno 가 없어 돌리지 못했다. 변경분은 직접 검토했고, 테스트 하네스 도입은 후속 작업으로 남는다.

## 알려진 한계

- 다른 탭의 세션은 토큰 만료(최대 1시간)까지 살아 있다. 근본 해소는 `tokenVersion` 도입
- `poi_forecasts` 쓰기 경로가 없어 30일 예측은 화면에서 숨겨진다. 집중률 예측 API 미신청
- 웰니스·생태 데이터가 없어 카테고리 가산점이 상시 0
- 이메일 수신거부 링크가 로그인 보호 경로를 가리켜 동작하지 않는다. HMAC 토큰 생성기는 완성되어 있고 호출부만 없다
- 방문 체크 UI 부재로 `PET_VERIFIED` 배지가 영구 미부여. 추천 점수의 검증 가중치 0.3 이 사장된다
