-- 댕로드 — pg_cron 인프라 + 한적도 MV + 좌표 정리
-- PRD §10.1, §11.6, §13.5, §14, §16.4

-- ═══════════════ 1. 확장 활성화 ═══════════════

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;       -- HTTP 호출 (Edge Functions trigger)
CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- gen_random_uuid + 향후 암호화

-- ═══════════════ 2. 한적도 7일 rolling MV (PRD §11.6) ═══════════════

CREATE MATERIALIZED VIEW IF NOT EXISTS quietness_7d_avg AS
SELECT
  sigungu_code,
  weekday,
  hour_slot,
  AVG(score)::int AS avg_score,
  SUM(COALESCE(sample_size, 1)) AS total_samples,
  MAX(computed_at) AS last_updated
FROM quietness_scores
WHERE computed_at >= NOW() - INTERVAL '7 days'
GROUP BY sigungu_code, weekday, hour_slot;

CREATE UNIQUE INDEX IF NOT EXISTS quietness_7d_avg_pk
  ON quietness_7d_avg (sigungu_code, weekday, hour_slot);

-- ═══════════════ 3. 출발지 좌표 정리 함수 (PRD §14) ═══════════════
-- "출발지 좌표는 추천 1회 사용 후 즉시 암호화 저장(주기적 삭제)"
-- 24h 이상 지난 완료된 추천의 좌표 무효화

CREATE OR REPLACE FUNCTION cleanup_recommendation_coords() RETURNS INTEGER AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE recommendations
  SET departure_lat = 0,
      departure_lng = 0,
      departure_geohash7 = ''
  WHERE completed_at IS NOT NULL
    AND completed_at < NOW() - INTERVAL '24 hours'
    AND departure_geohash7 != '';
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════ 4. pg_cron 스케줄 ═══════════════
-- 운영 시 [PROJECT-REF] / [SERVICE-ROLE-KEY] 치환 후 적용
-- 또는 Supabase Vault 로 시크릿 관리

-- 4-1. 한적도 MV 갱신 — 매일 새벽 3시 KST = 18:00 UTC (전날)
SELECT cron.schedule(
  'quietness-mv-refresh',
  '0 18 * * *',
  $$ REFRESH MATERIALIZED VIEW CONCURRENTLY quietness_7d_avg; $$
);

-- 4-2. 만료 배지 회수 — 매일 04:00 KST = 19:00 UTC
SELECT cron.schedule(
  'badges-expire',
  '0 19 * * *',
  $$ SELECT expire_stale_badges(); $$
);

-- 4-3. 출발지 좌표 정리 — 매시간
SELECT cron.schedule(
  'recommendations-coords-cleanup',
  '0 * * * *',
  $$ SELECT cleanup_recommendation_coords(); $$
);

-- 4-4. TourAPI 일별 ETL — 매일 02:00 KST = 17:00 UTC
-- 운영 시 supabase.vault 로 url/key 관리 권장
SELECT cron.schedule(
  'tour-api-etl-daily',
  '0 17 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/tour-api-etl',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('areaCode', 33)
    );
  $$
);

-- 4-5. 일일 추천 이메일 — 매분 호출 (Edge Function 안에서 user.email_notify_time 매칭)
-- PRD §16.4: 사용자 설정 시간에 발송 (디폴트 18:00 KST)
SELECT cron.schedule(
  'daily-recommend-email',
  '* * * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/daily-recommend-email',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      )
    );
  $$
);

-- ═══════════════ 5. 커스텀 설정 키 (Supabase Dashboard 에서 ALTER DATABASE) ═══════════════
-- 운영 적용 후 다음 명령으로 secret 주입:
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://[ref].supabase.co';
-- ALTER DATABASE postgres SET app.settings.service_role_key = '[service_role_key]';

COMMENT ON MATERIALIZED VIEW quietness_7d_avg IS 'PRD §11.6 — 한적도 7일 rolling 평균 (매일 03:00 KST 갱신)';
COMMENT ON FUNCTION cleanup_recommendation_coords() IS 'PRD §14 — 출발지 좌표 24h 후 무효화 (개인정보 최소화)';
