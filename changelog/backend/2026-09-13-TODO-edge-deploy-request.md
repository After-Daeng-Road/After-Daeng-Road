# [backend] 배포 요청 — Edge 함수 3종 + 크론 복구

- **날짜**: 2026-09-13
- **브랜치**: `feature/departure-address-input` (→ dev → main 머지 예정)
- **담당**: 백엔드 (Supabase 프로젝트 계정 보유자)
- **상태**: **완료 (2026-09-17).** 배포·크론 복구·확인 항목 전부 끝. 아래 "완료 기록" 참고

## 요청 내용

main에 Edge 함수 수정 3건이 올라갔습니다. Supabase 프로젝트 권한이 백엔드 계정에만 있어서 배포를 부탁드립니다.
원인·검증·절차 전체는 `changelog/backend/2026-09-13-quietness-cron-etl-fixes.md`에 있습니다.

## 바뀐 것

1. `time-slider-recommender` — 두루누비 코스(시군구 null)가 반경에 들어오면 한적도 조회가 400이 나서 카드가 전부
   "표본 부족"이 되던 버그. null 제거 + 조회 오류 로깅.
2. `tour-api-etl` — 옛 구조는 950건마다 펫 상세를 되물어 일일 한도(1000)를 넘기고, 429를 "펫 미등록"으로 저장해
   `pet_allowed` 83건이 지워질 수 있었음. 펫 전용 서비스 목록 기반으로 재작성(호출 약 100회, false로 덮는 경로 없음).
3. `daily-recommend-email` — 수신거부 링크가 로그인 보호 경로를 가리켜 동작 안 함. 웹이 검증하는 HMAC 토큰 링크로 교체.
   Edge 시크릿 `AUTH_SECRET`(웹 `.env`와 같은 값) 필요.

## 이미 운영 DB에 해둔 것 (재작업 불필요)

- 데이터랩 실측 한적도 140행 적재 완료.
- Vault `service_role_key`가 옛 키라 크론→Edge 호출이 전부 게이트웨이 401이었음 → 유효 키로 교체, 지금은 200.
- 옛 ETL이 돌면 펫 데이터가 지워져서 `tour-api-etl-daily` 크론 잡을 **임시로 내려놓음**. 새 ETL 배포 후 아래 SQL로 복구 필요.
- 스토리지 버킷 마이그레이션 0021(업로드 포맷·용량) 적용 완료.

## 해야 할 일

- [x] main 최신화 후 Edge 시크릿·함수 3종 배포

```bash
git checkout main && git pull
cd apps/api
npx supabase secrets set AUTH_SECRET=<apps/web/.env.local 의 AUTH_SECRET 값>
npx supabase secrets set KAKAO_REST_API_KEY=<카카오 REST API 키>   # 발급되면 — 추천 ETA 실도로 시간
npx supabase functions deploy time-slider-recommender
npx supabase functions deploy tour-api-etl
npx supabase functions deploy daily-recommend-email
```

- [x] Supabase SQL Editor에서 ETL 크론 재등록

```sql
SELECT cron.schedule('tour-api-etl-daily', '0 17 * * *', $$
  SELECT net.http_post(
    url := app_secret('supabase_url') || '/functions/v1/tour-api-etl',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || app_secret('service_role_key'),
      'x-cron-secret', app_secret('cron_secret'),
      'Content-Type', 'application/json'),
    body := jsonb_build_object('areaCode', 33));
$$);
```

## 확인

- [x] 홈에서 추천받기 → 카드 한적도가 "표본 부족" 대신 숫자로 나오면 성공.
- [x] `select status_code, created from net._http_response order by created desc limit 5;` 가 200이면 크론 정상.
      401 `{"error":"Unauthorized"}`면 Vault `cron_secret`과 Edge 시크릿 `CRON_SECRET`이 다른 것.
- [x] 첫 ETL 실행(02:00 KST) 후 `tour_api_sync_logs`에 status `ok` 행이 생기고 `pet_allowed=true`가 83건 그대로면 정상.

## 급하지 않은 것

- ~~`RESEND_API_KEY` Edge 시크릿 등록 전까지 메일은 dry-run(로그만 적재).~~ 확인 결과 8/29에 이미 등록돼 있었다. 실발송 상태.
- 프론트 담당을 Supabase 프로젝트 멤버로 초대하면 다음부터 직접 배포 가능.

## 완료 기록 (2026-09-17, 백엔드)

### 한 것

| 항목 | 일시 (KST) | 비고 |
|---|---|---|
| `AUTH_SECRET` Edge 시크릿 | 9/16 15:15 | 웹 `.env.local` 값 |
| 함수 3종 배포 | 9/16 15:16~15:30 | `tour-api-etl`은 1차 배포가 조용히 건너뛰어져 재배포 |
| `tour-api-etl-daily` 크론 재등록 | 9/16 15:25 | jobid 14 |
| `KAKAO_REST_API_KEY` Edge 시크릿 | 9/17 10:30 | 카카오모빌리티 길찾기는 무료 쿼터 안 비상업 사용이라 별도 신청 없이 통과 |
| **`TOUR_API_SERVICE_KEY` Edge 시크릿** | 9/17 10:45 | **이 문서에 빠져 있던 항목** — 아래 참고 |
| ETL 수동 1회 실행 | 9/17 10:49 | `ok` · 61초 · 추가 6 · 갱신 912 · 실패 0 |

### 확인 결과

- 아산 출발 3h 호출: `sampleSufficient` **0/3 → 3/3**, 한적도 62. 배포 전 재현과 같은 조건
- 카카오 REST 키 등록 후 같은 조건: 거리 2.2/7/8.6km(직선) → **2.6/7.4/10.7km(실도로)**, 편도 8/15/17분
- 크론→Edge 응답 15분간 전부 200
- ETL 후 `pet_allowed=true` **83건 그대로**, POI 972건 중 918건 동기화, 신규 6건
- 배포본 검증은 `supabase functions download`로 원격 소스를 받아 로컬 main과 `diff` — `functions list`의
  버전·해시는 조회마다 값이 바뀌어(관리 API 캐시) 신뢰하지 않았다

### 이 문서에 없었던 것 — `TOUR_API_SERVICE_KEY`

첫 크론(9/17 02:00 KST)은 정상 발화했지만 ETL이 `TourAPI HTTP 401 SERVICE_KEY_IS_NULL`로 실패했다.
Edge 시크릿에 관광공사 키가 한 번도 등록된 적이 없었다 — 옛 ETL은 게이트웨이 401로 함수 본문에 들어간 적이
없어서 드러나지 않았던 것. `apps/api/.env`의 값(88자)을 그대로 등록했다.

```bash
npx supabase secrets set TOUR_API_SERVICE_KEY=<apps/api/.env 의 TOUR_API_SERVICE_KEY>
```

ETL 함수 재작성 의도대로, 실패한 실행은 `pois`를 전혀 건드리지 않았다(펫 83건 보존).

### 주의 — `supabase functions deploy`가 조용히 건너뛸 수 있다

CLI 2.117은 로컬 번들 해시와 원격 `ezbr_sha256`이 같으면 "No change found"로 업로드를 생략한다. 이번에
`tour-api-etl`이 "Deployed Functions." 메시지를 내고도 옛 코드가 남아 있었다. 배포 뒤에는 목록의 버전 번호가
아니라 **원격 소스를 내려받아 diff** 하거나 실제 호출로 확인한다.

### 프론트에 남은 것

- `NEXT_PUBLIC_KAKAO_JS_KEY` — `apps/web/.env.local`·Vercel 등록 (`changelog/frontend/2026-09-13-TODO-kakao-keys.md`)
- `KAKAO_REST_API_KEY` — 웹 `.env.local`·Vercel 등록. Edge 쪽은 끝났다
