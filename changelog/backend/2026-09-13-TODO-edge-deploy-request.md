# [backend][TODO] 배포 요청 — Edge 함수 3종 + 크론 복구

- **날짜**: 2026-09-13
- **브랜치**: `feature/departure-address-input` (→ dev → main 머지 예정)
- **담당**: 백엔드 (Supabase 프로젝트 계정 보유자)
- **상태**: **미완료 — 배포 대기.** 아래 체크리스트를 끝내면 이 파일 상태를 "완료" 로 바꾸고 날짜를 적는다

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

- [ ] main 최신화 후 Edge 시크릿·함수 3종 배포

```bash
git checkout main && git pull
cd apps/api
npx supabase secrets set AUTH_SECRET=<apps/web/.env.local 의 AUTH_SECRET 값>
npx supabase secrets set KAKAO_REST_API_KEY=<카카오 REST API 키>   # 발급되면 — 추천 ETA 실도로 시간
npx supabase functions deploy time-slider-recommender
npx supabase functions deploy tour-api-etl
npx supabase functions deploy daily-recommend-email
```

- [ ] Supabase SQL Editor에서 ETL 크론 재등록

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

- [ ] 홈에서 추천받기 → 카드 한적도가 "표본 부족" 대신 숫자로 나오면 성공.
- [ ] `select status_code, created from net._http_response order by created desc limit 5;` 가 200이면 크론 정상.
      401 `{"error":"Unauthorized"}`면 Vault `cron_secret`과 Edge 시크릿 `CRON_SECRET`이 다른 것.
- [ ] 첫 ETL 실행(02:00 KST) 후 `tour_api_sync_logs`에 status `ok` 행이 생기고 `pet_allowed=true`가 83건 그대로면 정상.

## 급하지 않은 것

- `RESEND_API_KEY` Edge 시크릿 등록 전까지 메일은 dry-run(로그만 적재).
- 프론트 담당을 Supabase 프로젝트 멤버로 초대하면 다음부터 직접 배포 가능.
