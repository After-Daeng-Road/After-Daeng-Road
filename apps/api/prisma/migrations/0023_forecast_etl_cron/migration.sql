-- 0023 — 관광지 집중률 30일 예측 일별 갱신 크론 (forecast-etl)
--
-- 예측값은 매일 새로 계산되고 창이 하루씩 밀린다. 갱신하지 않으면 "내일" 에 해당하는 행이
-- 하루씩 사라져 30일 뒤에는 카드의 예측 라인이 전부 없어진다.
--
-- 시각: 17:30 UTC = 02:30 KST
--   tour-api-etl(17:00 UTC)이 POI 를 갱신한 뒤에 돌아야 한다 — 새로 들어온 POI 도 매칭 대상이고,
--   예측은 pois.name 으로 붙기 때문이다. 실측 ETL 소요는 약 60초.
--   quietness-mv-refresh(18:00 UTC)와도 겹치지 않는다.
--
-- 시크릿은 0020 의 app_secret() 규약을 그대로 쓴다(Vault 우선, app.settings.* 폴백).
-- 선행 조건: Edge 시크릿 TOUR_API_SERVICE_KEY · CRON_SECRET · SUPABASE_SERVICE_ROLE_KEY,
--           그리고 forecast-etl 함수 배포.

-- 재실행 가능하게 — 이미 있으면 지우고 다시 건다
DO $$
BEGIN
  PERFORM cron.unschedule('forecast-etl-daily');
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'forecast-etl-daily 미등록';
END $$;

SELECT cron.schedule(
  'forecast-etl-daily',
  '30 17 * * *',
  $$
    SELECT net.http_post(
      url := app_secret('supabase_url') || '/functions/v1/forecast-etl',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || app_secret('service_role_key'),
        'x-cron-secret', app_secret('cron_secret'),
        'Content-Type', 'application/json'),
      body := '{}'::jsonb,
      timeout_milliseconds := 180000);
  $$
);
