-- 댕로드 — 검증 배지 자동 grant 트리거 (PRD §6.3, §16.2)
-- 조건: 다른 사용자 3명 이상 + 사진 1장+ + 최근 6개월 + EXIF isValid=true

-- ═══════════════ 1. 자동 grant 함수 ═══════════════

CREATE OR REPLACE FUNCTION grant_pet_verified_badge() RETURNS TRIGGER AS $$
DECLARE
  unique_visitors INTEGER;
BEGIN
  -- 이미 배지 있으면 skip
  IF EXISTS (
    SELECT 1 FROM badges
    WHERE poi_id = NEW.poi_id AND badge_type = 'PET_VERIFIED'
  ) THEN
    RETURN NEW;
  END IF;

  -- 최근 6개월 + isValid + 사진 있는 고유 방문자 수
  SELECT COUNT(DISTINCT user_id) INTO unique_visitors
  FROM verifications
  WHERE poi_id = NEW.poi_id
    AND is_valid = true
    AND photo_url IS NOT NULL
    AND visited_at >= NOW() - INTERVAL '6 months';

  IF unique_visitors >= 3 THEN
    INSERT INTO badges (id, poi_id, badge_type, granted_at, expires_at, metadata)
    VALUES (
      gen_random_uuid(),
      NEW.poi_id,
      'PET_VERIFIED',
      NOW(),
      NOW() + INTERVAL '6 months',
      jsonb_build_object('initial_visitors', unique_visitors)
    )
    ON CONFLICT (poi_id, badge_type) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════ 2. 트리거 ═══════════════

DROP TRIGGER IF EXISTS tr_grant_pet_verified ON verifications;
CREATE TRIGGER tr_grant_pet_verified
AFTER INSERT ON verifications
FOR EACH ROW
EXECUTE FUNCTION grant_pet_verified_badge();

-- ═══════════════ 3. 만료 배지 자동 회수 함수 (PRD §16.2 6개월 신선도) ═══════════════

CREATE OR REPLACE FUNCTION expire_stale_badges() RETURNS INTEGER AS $$
DECLARE
  removed INTEGER;
BEGIN
  WITH expired AS (
    DELETE FROM badges
    WHERE expires_at IS NOT NULL AND expires_at < NOW()
    RETURNING 1
  )
  SELECT COUNT(*) INTO removed FROM expired;
  RETURN removed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════ 4. 웰니스/생태 배지 자동 부여 (POI source 기반) ═══════════════

CREATE OR REPLACE FUNCTION sync_category_badges() RETURNS INTEGER AS $$
DECLARE
  inserted INTEGER := 0;
BEGIN
  -- 웰니스
  WITH ins AS (
    INSERT INTO badges (id, poi_id, badge_type, granted_at)
    SELECT gen_random_uuid(), id, 'WELLNESS', NOW()
    FROM pois
    WHERE is_wellness = true
    ON CONFLICT (poi_id, badge_type) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO inserted FROM ins;

  -- 생태
  WITH ins AS (
    INSERT INTO badges (id, poi_id, badge_type, granted_at)
    SELECT gen_random_uuid(), id, 'ECO', NOW()
    FROM pois
    WHERE is_eco = true
    ON CONFLICT (poi_id, badge_type) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) + inserted INTO inserted FROM ins;

  -- 두루누비 공식 코스
  WITH ins AS (
    INSERT INTO badges (id, poi_id, badge_type, granted_at)
    SELECT gen_random_uuid(), poi_id, 'TRAIL_OFFICIAL', NOW()
    FROM durunubi_courses
    WHERE poi_id IS NOT NULL
    ON CONFLICT (poi_id, badge_type) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) + inserted INTO inserted FROM ins;

  RETURN inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION grant_pet_verified_badge() IS 'PRD §6.3 — 3명+ 사진+ 6개월 충족 시 PET_VERIFIED 자동 부여';
COMMENT ON FUNCTION expire_stale_badges() IS 'PRD §16.2 — 6개월 신선도 만료 배지 회수 (pg_cron daily)';
COMMENT ON FUNCTION sync_category_badges() IS 'POI 메타 기반 카테고리 배지 동기화 (ETL 후 호출)';
