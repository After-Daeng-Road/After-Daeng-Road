-- 0020 — 크론·암호화 시크릿을 Supabase Vault 에서 읽도록 전환
--
-- ═══ 무엇이 잘못되어 있었나 ═══
-- 0004 는 pg_cron 의 http_post 가 쓸 값을 ALTER DATABASE ... SET app.settings.* 로
-- 주입하라고 안내했다. 그런데 Supabase 는 postgres 롤에 커스텀 파라미터 설정 권한을 주지 않는다.
--
--   ERROR: 42501: permission denied to set parameter "app.settings.cron_secret"
--
-- 그 결과 값이 한 번도 설정되지 못했고, HTTP 를 쓰는 크론 잡 두 개가 등록 이후
-- 단 한 번도 성공하지 못했다. 실제 cron.job_run_details 확인 결과:
--
--   daily-recommend-email | failed | ERROR: unrecognized configuration parameter "app.settings.supabase_url"
--
-- daily-recommend-email 은 매분 스케줄이라 매분 실패를 쌓아 왔다.
-- 순수 SQL 잡(recommendations-coords-cleanup 등)만 정상이었다.
--
-- 0005 의 좌표 암호화도 같은 키 방식이라 encrypt_coord 가 늘 NULL 을 반환했다.
-- 암호화 컬럼이 비어 있고 평문만 남다가 24시간 뒤 지워지는 상태였다.
--
-- ═══ 해결 ═══
-- Supabase Vault 를 쓴다. 0004 주석이 이미 "운영 시 supabase.vault 로 관리 권장"이라 적어둔 방식이다.
-- Vault 는 대시보드 SQL Editor 에서 postgres 롤로 생성·조회가 가능하다(실측 확인).
--
-- app_secret(name) 이 Vault 를 먼저 보고, 없으면 예전 app.settings.* 로 폴백한다.
-- 폴백을 남기는 이유: 로컬 supabase start 환경은 ALTER DATABASE 가 가능해 그대로 쓸 수 있다.

-- ═══════════════ 1. 시크릿 조회 헬퍼 ═══════════════

CREATE OR REPLACE FUNCTION app_secret(p_name TEXT) RETURNS TEXT AS $$
DECLARE
  v TEXT;
BEGIN
  -- Vault 우선
  BEGIN
    SELECT decrypted_secret INTO v
      FROM vault.decrypted_secrets
     WHERE name = p_name
     LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v := NULL;  -- Vault 미설치·권한 없음 등
  END;

  IF v IS NOT NULL AND v <> '' THEN
    RETURN v;
  END IF;

  -- 폴백: 로컬 개발 등 ALTER DATABASE 가 가능한 환경
  RETURN COALESCE(current_setting('app.settings.' || p_name, true), '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault;

COMMENT ON FUNCTION app_secret(TEXT) IS
  '시크릿 조회 — Vault 우선, app.settings.* 폴백. Supabase 는 ALTER DATABASE SET 을 막으므로 Vault 가 정본';

-- 시크릿을 반환하는 함수라 일반 롤에서 호출 가능하면 안 된다.
-- anon/authenticated 롤이 없는 환경(로컬 초기화 직후)도 있어 존재할 때만 회수한다.
REVOKE ALL ON FUNCTION app_secret(TEXT) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION app_secret(TEXT) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION app_secret(TEXT) FROM authenticated;
  END IF;
END $$;

-- ═══════════════ 2. 좌표 암호화가 Vault 키를 쓰도록 ═══════════════
-- 키가 없으면 여전히 NULL 을 반환한다(개발 환경 허용). 다만 이제 Vault 에 넣으면 실제로 동작한다.

CREATE OR REPLACE FUNCTION encrypt_coord(coord DOUBLE PRECISION) RETURNS BYTEA AS $$
DECLARE
  k TEXT := app_secret('coord_encryption_key');
BEGIN
  IF coord IS NULL OR k = '' THEN RETURN NULL; END IF;
  RETURN pgp_sym_encrypt(coord::TEXT, k);
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault, extensions;

CREATE OR REPLACE FUNCTION decrypt_coord(enc BYTEA) RETURNS DOUBLE PRECISION AS $$
DECLARE
  k TEXT := app_secret('coord_encryption_key');
BEGIN
  IF enc IS NULL OR k = '' THEN RETURN NULL; END IF;
  RETURN pgp_sym_decrypt(enc, k)::DOUBLE PRECISION;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault, extensions;

-- ═══════════════ 3. 크론 잡을 Vault 기반으로 재등록 ═══════════════

DO $$
BEGIN
  PERFORM cron.unschedule('tour-api-etl-daily');
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'tour-api-etl-daily 미등록';
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('daily-recommend-email');
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'daily-recommend-email 미등록';
END $$;

-- TourAPI 일별 ETL — 매일 02:00 KST = 17:00 UTC
SELECT cron.schedule(
  'tour-api-etl-daily',
  '0 17 * * *',
  $$
    SELECT net.http_post(
      url := app_secret('supabase_url') || '/functions/v1/tour-api-etl',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || app_secret('service_role_key'),
        'x-cron-secret', app_secret('cron_secret'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('areaCode', 33)
    );
  $$
);

-- 일일 추천 이메일 — 매분 (Edge 안에서 email_notify_time 매칭)
SELECT cron.schedule(
  'daily-recommend-email',
  '* * * * *',
  $$
    SELECT net.http_post(
      url := app_secret('supabase_url') || '/functions/v1/daily-recommend-email',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || app_secret('service_role_key'),
        'x-cron-secret', app_secret('cron_secret'),
        'Content-Type', 'application/json'
      )
    );
  $$
);

-- ═══════════════ 4. 운영 적용 절차 ═══════════════
-- Supabase Dashboard → SQL Editor 에서 아래 세 개를 생성한다(값은 실제 값으로 교체).
-- 이미 있으면 vault.update_secret(id, new_secret) 로 갱신한다.
--
--   SELECT vault.create_secret('https://<ref>.supabase.co', 'supabase_url',        'pg_cron → Edge Function 호출 대상');
--   SELECT vault.create_secret('<service_role_key>',        'service_role_key',    'pg_cron → Edge Function 인증');
--   SELECT vault.create_secret('<cron_secret>',             'cron_secret',         'Edge Function 공유 시크릿 (supabase secrets 와 동일 값)');
--   SELECT vault.create_secret('<32바이트 랜덤>',            'coord_encryption_key','출발지 좌표 대칭키 (PRD §14)');
--
-- 확인:
--   SELECT app_secret('supabase_url'), left(app_secret('cron_secret'), 6) || '…';
