-- 댕로드 — 출발지 좌표 암호화 (PRD §14)
-- "출발지 좌표는 추천 1회 사용 후 즉시 암호화 저장(주기적 삭제)"
-- pgcrypto + AES-256-CBC, 키는 Supabase Vault 또는 ALTER DATABASE SET 으로 주입

-- ═══════════════ 1. 암호화 컬럼 추가 ═══════════════

ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS departure_lat_enc BYTEA,
  ADD COLUMN IF NOT EXISTS departure_lng_enc BYTEA;

-- 평문 컬럼은 추천 응답 직후 NULL/0 처리되며 (cleanup_recommendation_coords)
-- 다음 마이그레이션에서 NULLABLE 로 전환 (호환성 유지)
ALTER TABLE recommendations
  ALTER COLUMN departure_lat DROP NOT NULL,
  ALTER COLUMN departure_lng DROP NOT NULL,
  ALTER COLUMN departure_geohash7 DROP NOT NULL;

-- ═══════════════ 2. 암호화 / 복호화 헬퍼 ═══════════════
-- 키 출처: current_setting('app.settings.coord_encryption_key')
-- 운영 적용 전: ALTER DATABASE postgres SET app.settings.coord_encryption_key = '<32-byte-base64>';

CREATE OR REPLACE FUNCTION encrypt_coord(coord DOUBLE PRECISION) RETURNS BYTEA AS $$
BEGIN
  IF coord IS NULL THEN RETURN NULL; END IF;
  RETURN pgp_sym_encrypt(
    coord::TEXT,
    current_setting('app.settings.coord_encryption_key', true)
  );
EXCEPTION WHEN undefined_object OR invalid_parameter_value THEN
  -- 키 미설정 시 평문 보존 (개발 환경)
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_coord(enc BYTEA) RETURNS DOUBLE PRECISION AS $$
BEGIN
  IF enc IS NULL THEN RETURN NULL; END IF;
  RETURN pgp_sym_decrypt(
    enc,
    current_setting('app.settings.coord_encryption_key', true)
  )::DOUBLE PRECISION;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════ 3. INSERT 트리거: 평문 → 암호화 자동 백필 ═══════════════

CREATE OR REPLACE FUNCTION encrypt_recommendation_coords() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.departure_lat IS NOT NULL AND NEW.departure_lat_enc IS NULL THEN
    NEW.departure_lat_enc := encrypt_coord(NEW.departure_lat);
  END IF;
  IF NEW.departure_lng IS NOT NULL AND NEW.departure_lng_enc IS NULL THEN
    NEW.departure_lng_enc := encrypt_coord(NEW.departure_lng);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_encrypt_recommendation_coords ON recommendations;
CREATE TRIGGER tr_encrypt_recommendation_coords
BEFORE INSERT OR UPDATE OF departure_lat, departure_lng ON recommendations
FOR EACH ROW
EXECUTE FUNCTION encrypt_recommendation_coords();

-- ═══════════════ 4. cleanup 함수 갱신 — 평문만 NULL, 암호화는 보존 ═══════════════

CREATE OR REPLACE FUNCTION cleanup_recommendation_coords() RETURNS INTEGER AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE recommendations
  SET departure_lat = NULL,
      departure_lng = NULL,
      departure_geohash7 = NULL
  WHERE completed_at IS NOT NULL
    AND completed_at < NOW() - INTERVAL '24 hours'
    AND (departure_lat IS NOT NULL OR departure_lng IS NOT NULL);
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════ 5. 90일 이상 된 암호화 좌표 완전 삭제 (주기적 삭제) ═══════════════

CREATE OR REPLACE FUNCTION purge_old_recommendation_coords() RETURNS INTEGER AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE recommendations
  SET departure_lat_enc = NULL,
      departure_lng_enc = NULL
  WHERE completed_at < NOW() - INTERVAL '90 days'
    AND (departure_lat_enc IS NOT NULL OR departure_lng_enc IS NOT NULL);
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 매주 일요일 04:00 KST = 19:00 토 UTC
SELECT cron.schedule(
  'purge-coord-encryption',
  '0 19 * * 6',
  $$ SELECT purge_old_recommendation_coords(); $$
);

COMMENT ON COLUMN recommendations.departure_lat_enc IS 'PRD §14 — pgp_sym_encrypt 로 암호화된 출발지 위도';
COMMENT ON FUNCTION encrypt_coord(DOUBLE PRECISION) IS '키 미설정 시 NULL 반환 (개발). 운영은 ALTER DATABASE SET app.settings.coord_encryption_key 필수';
