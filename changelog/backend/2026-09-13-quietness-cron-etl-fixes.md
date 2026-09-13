# [backend] 한적도 표본 부족 원인 · 데이터랩 실측 적재 · 크론 무응답 원인(Vault 키) · ETL 안전화 · 수신거부 링크

- **날짜**: 2026-09-13
- **브랜치**: `feature/departure-address-input` (← `dev`)
- **담당**: 프론트엔드가 조사·수정 (Edge 함수)
- **상태**: 운영 DB 작업(실측 적재·Vault 키·ETL 잡 해제) 완료. Edge 3종 **재배포 필요** — 팀원 Supabase 계정

## 증상

홈 추천 카드의 한적도가 항상 `— 표본 부족`, 값은 중립 60. 최근 추천 이력 3건(9/6·9/13) 전부 동일.
DB 에는 `quietness_scores` 가 4개 시 × 7요일 × 5시간대 = 140행 그대로 있다.

## 원인

`time-slider-recommender` 가 후보 POI 의 `sigungu_code` 를 모아 한 번에 조회한다:

```ts
const sigungus = [...new Set(slice.map((p) => p.sigungu_code))];
supabase.from('quietness_scores').select(...).in('sigungu_code', sigungus)
```

두루누비 코스 POI 중 서비스 4시 밖(태안·당진·보령·서천) 13건은 `sigungu_code` 가 **null** 이다.
반경 안에 그중 하나라도 들어오면 `sigungus` 에 null 이 섞이고, PostgREST 는 `in.(33050,null)` 을
integer 로 파싱하지 못해 400 을 돌려준다:

```
invalid input syntax for type integer: "null"
```

`fetchQuietnessNow` 가 `const { data } = await …` 로 `error` 를 버려서 이 실패가 조용히 빈 맵이 됐고,
후보 전원이 `sampleSufficient=false` 로 떨어졌다. 아산·서산 출발은 반경 50km 안에 그런 코스가
거의 항상 들어오므로 사실상 모든 검색이 이랬다. 두루누비 연동(#42) 이후 생긴 회귀다.

배포된 함수 상대로 재현: 아산 출발 3h → 3건 전부 `q=60 ss=false`. 같은 조건에서 null 을 뺀
쿼리는 15행 정상 반환.

## 조치

- `sigungus` 에서 null 제거 (`filter((s): s is number => s != null)`)
- `PoiCandidate.sigungu_code` 타입을 `number | null` 로 정직하게, `computeQuietness` 는 null 이면
  한적도 조회를 건너뛴다 (그 POI 만 "표본 부족" — 실제로 그 지역 데이터가 없으므로 맞는 표시)
- `quietness_scores` · `poi_forecasts` · `verifications` · `badges` 네 조회 모두 `error` 를
  `console.error` 로 남긴다. supabase-js 는 throw 하지 않으므로 검사하지 않으면 또 위장된다

## 함께 확인된 것 (별건)

**호스티드 DB 의 `DATABANK_VISITOR` 140행은 실측이 아니다.** `computed_at` 이 2026-07-19,
`sample_size` 가 전부 100 — `0016` 이전 `seed.ts` 가 합성 공식으로 만들어 실측 라벨을 붙이던 시절의
행이다. 아산 일요일 5개 값을 합성 공식(`base + (sgg+wd*7+h)%15-5`)과 대조하니 전부 일치했다.

즉 `seed:datalab` 은 운영 DB 에서 한 번도 성공하지 못했다. 첫 실행이 타임아웃으로 죽었고
(`feature/datalab-retry` 커밋 메시지), 그 재시도 수정은 아직 dev 에 미머지다. 화면의
"요일·지역은 한국관광공사 방문자 데이터" 근거 표기가 현재 운영 데이터와 맞지 않는다.

## 배포 절차

```bash
cd apps/api
npx supabase functions deploy time-slider-recommender
```

배포 후 `npm run verify:recommend` (RECOMMEND_FN_URL 을 호스티드로) 로 `sampleSufficient=true` 확인.

## 같은 날 이어서 한 것

### A. 데이터랩 실측 적재 (완료)

`npm run seed:datalab` 을 운영 DB 상대로 실행해 합성 140행을 실측으로 교체했다
(`computed_at` 2026-09-13, 표본 8주). 예: 서산 목 9h 83 · 12h 70 · 15h 67 · 18h 75 · 21h 85.
`apps/api/.env` 의 비어 있던 `TOUR_API_SERVICE_KEY` 를 채웠다(DB URL 은 아직 placeholder — 실행 시 웹 값 주입).
재시도 수정 PR #55(`feature/datalab-retry`) 를 dev 에 머지했다.

### B. 크론 → Edge 호출이 전부 401 이던 원인 (Vault `service_role_key`)

`net._http_response` 최근 2일 360건 전부 게이트웨이 401 `Invalid API key`. `tour_api_sync_logs` 0건,
`email_logs` 0건 — **두 크론 함수는 등록 이후 한 번도 본문에 진입한 적이 없다.**
Vault 의 `service_role_key` 가 웹 `.env` 의 키와 달랐다(둘 다 `sb_secret_…` 형식, 값만 다름). 웹 키는
게이트웨이를 통과하므로(함수 본문의 401 `{"error":"Unauthorized"}` 까지 도달) Vault 쪽이 회전 전 키였다.
`vault.update_secret` 로 웹 키 값으로 교체했다.

### C. `tour-api-etl` 잡 해제 (임시) + 함수 재작성

키를 고치면 매일 02시 ETL 이 실제로 돌기 시작하는데, 배포된 ETL 은 POI 950건마다 `detailPetTour2` 를
되물어 일일 한도(1000)를 넘기고, 429 를 "펫 미등록" 으로 저장한다 → `pet_allowed` 83건이 false 로 덮인다.
그래서 **새 ETL 이 배포될 때까지 `cron.unschedule('tour-api-etl-daily')`** 로 잡을 내렸다.

함수는 `seed-pet-realdata.ts` 와 같은 구조로 다시 썼다: 일반 목록은 기본 필드만 upsert(pet_* 불변),
펫 전용 서비스 목록으로 `pet_allowed=true` 만 올리고, 상세 실패는 건너뛴다. false 를 쓰는 경로가 없다.
호출량 약 950 → 약 100. `image_urls` 는 시드가 병합한 상세 이미지가 있어 갱신 대상에서 뺐다.

배포 후 잡 복구 SQL (0020 과 동일 본문):

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

### D. 이메일 수신거부 링크

`daily-recommend-email` 이 `/me/settings?unsubscribe=1&u=` 로 보냈다 — 로그인 보호 경로이고 처리 로직도
없었다. 웹 `/unsubscribe?token=` 이 검증하는 HMAC 형식(`base64url(userId:ts).base64url(sig)`)을 Edge 에서
WebCrypto 로 만들도록 했다. Node 검증기와 대조해 통과 확인. Edge 시크릿 `AUTH_SECRET`(웹과 동일 값)이
필요하며, 없으면 `/me/notifications` 로 폴백한다.

## 팀원(Supabase 계정) 배포 절차

```bash
cd apps/api
npx supabase secrets set AUTH_SECRET=<apps/web .env 의 AUTH_SECRET>   # 수신거부 토큰
npx supabase functions deploy time-slider-recommender               # 한적도 표본 부족 해소
npx supabase functions deploy tour-api-etl                          # 안전한 ETL
npx supabase functions deploy daily-recommend-email                 # 수신거부 링크
# 그 다음 SQL Editor 에서 위 C 의 cron.schedule 실행
```

배포 후 확인: `net._http_response` 의 최근 status_code 가 200 이어야 한다. 401 `{"error":"Unauthorized"}` 면
Vault `cron_secret` 과 Edge 시크릿 `CRON_SECRET` 이 다른 것이다.

## 남은 것 / 후속

- 두루누비 13건 `sigungu_code` null: 태안·당진·보령·서천 코드를 채우고 `seed-datalab` 의 `SIGUNGU_MAP` 에
  해당 행정코드를 더하면 그 코스들도 한적도를 갖는다
- `RESEND_API_KEY` Edge 시크릿 등록 전까지 메일은 dry-run(로그만 적재)
