-- 0017 — pg_cron 의 Edge Function 호출에 공유 시크릿 헤더 추가
--
-- 배경:
--   config.toml 에서 tour-api-etl 과 daily-recommend-email 은 verify_jwt = false 다.
--   플랫폼 게이트웨이가 아무것도 검사하지 않고, 두 핸들러도 요청 헤더를 보지 않았다.
--   함수 URL 만 알면 누구나 호출할 수 있는 상태였다 — 프로젝트 ref 는
--   NEXT_PUBLIC_SUPABASE_URL 로 웹 클라이언트 번들에 공개되어 있어 URL 추측이 쉽다.
--
--   verify_jwt = true 로 바꾸는 것으로는 방어가 안 된다. anon 키도 유효한 JWT 이고
--   그 키 역시 번들에 공개되어 있다. 함수 안에서 공유 시크릿을 직접 검사해야 하며
--   (같은 PR 의 Edge 코드), 이 마이그레이션은 pg_cron 이 그 헤더를 보내도록 한다.
--
-- 주의:
--   0004 파일은 이미 적용되어 있으므로 수정하지 않는다(체크섬 드리프트).
--   같은 이름으로 cron.schedule 을 다시 호출하면 pg_cron 버전에 따라 갱신이 아니라
--   중복 등록될 수 있으므로 unschedule 을 먼저 한다.
--
-- 선행 조건:
--   ALTER DATABASE ... SET app.settings.cron_secret = '<값>' 이 되어 있어야 한다.
--   미설정이면 헤더가 빈 문자열로 나가고 Edge 가 401 로 거부한다(fail-closed).
--   Supabase Dashboard 또는 psql 에서 설정한 뒤 supabase secrets set CRON_SECRET 도 같은 값으로 맞춘다.

-- 기존 잡 제거 (없으면 무시)
DO $$
BEGIN
  PERFORM cron.unschedule('tour-api-etl-daily');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'tour-api-etl-daily 미등록 — 건너뜀';
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('daily-recommend-email');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'daily-recommend-email 미등록 — 건너뜀';
END $$;

-- TourAPI 일별 ETL — 매일 02:00 KST = 17:00 UTC
SELECT cron.schedule(
  'tour-api-etl-daily',
  '0 17 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/tour-api-etl',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'x-cron-secret', COALESCE(current_setting('app.settings.cron_secret', true), ''),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('areaCode', 33)
    );
  $$
);

-- 일일 추천 이메일 — 매분 호출 (Edge 안에서 email_notify_time 매칭)
SELECT cron.schedule(
  'daily-recommend-email',
  '* * * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/daily-recommend-email',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'x-cron-secret', COALESCE(current_setting('app.settings.cron_secret', true), ''),
        'Content-Type', 'application/json'
      )
    );
  $$
);
