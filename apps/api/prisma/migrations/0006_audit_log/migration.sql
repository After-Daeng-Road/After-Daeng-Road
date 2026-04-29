-- 댕로드 — Audit Log 테이블 + 핵심 변경 추적 트리거
-- PRD §14, §16: 검증 배지 grant, vendor 승인, 후기 삭제 등 보안 감사 추적

-- ═══════════════ 1. audit_logs 테이블 ═══════════════

CREATE TABLE IF NOT EXISTS audit_logs (
  id            BIGSERIAL PRIMARY KEY,
  actor_id      UUID,                     -- auth.uid() 또는 NULL (트리거/서비스)
  action        TEXT NOT NULL,            -- e.g. 'badge.grant', 'vendor.approve', 'review.hide'
  resource_type TEXT NOT NULL,            -- e.g. 'badge', 'vendor', 'review'
  resource_id   TEXT NOT NULL,
  metadata      JSONB,                    -- 변경 전/후 등
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor    ON audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action   ON audit_logs (action, created_at DESC);

-- RLS — 운영자만 SELECT, 서비스만 INSERT
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_admin_read ON audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- ═══════════════ 2. badges grant 추적 트리거 ═══════════════

CREATE OR REPLACE FUNCTION audit_badge_changes() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (actor_id, action, resource_type, resource_id, metadata)
    VALUES (
      auth.uid(),
      'badge.grant',
      'badge',
      NEW.id::TEXT,
      jsonb_build_object('poi_id', NEW.poi_id, 'badge_type', NEW.badge_type, 'expires_at', NEW.expires_at)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (actor_id, action, resource_type, resource_id, metadata)
    VALUES (
      auth.uid(),
      'badge.revoke',
      'badge',
      OLD.id::TEXT,
      jsonb_build_object('poi_id', OLD.poi_id, 'badge_type', OLD.badge_type)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_audit_badges ON badges;
CREATE TRIGGER tr_audit_badges
AFTER INSERT OR DELETE ON badges
FOR EACH ROW EXECUTE FUNCTION audit_badge_changes();

-- ═══════════════ 3. vendor 승인 추적 ═══════════════

CREATE OR REPLACE FUNCTION audit_vendor_approval() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
    INSERT INTO audit_logs (actor_id, action, resource_type, resource_id, metadata)
    VALUES (
      auth.uid(),
      'vendor.' || lower(NEW.approval_status::TEXT),
      'vendor',
      NEW.id::TEXT,
      jsonb_build_object(
        'before', OLD.approval_status,
        'after', NEW.approval_status,
        'biz_number', NEW.biz_number
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_audit_vendor_approval ON vendors;
CREATE TRIGGER tr_audit_vendor_approval
AFTER UPDATE ON vendors
FOR EACH ROW EXECUTE FUNCTION audit_vendor_approval();

-- ═══════════════ 4. review 상태 변경 추적 (숨김/삭제) ═══════════════

CREATE OR REPLACE FUNCTION audit_review_status() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO audit_logs (actor_id, action, resource_type, resource_id, metadata)
    VALUES (
      auth.uid(),
      'review.' || lower(NEW.status::TEXT),
      'review',
      NEW.id::TEXT,
      jsonb_build_object(
        'before', OLD.status,
        'after', NEW.status,
        'report_count', NEW.report_count,
        'poi_id', NEW.poi_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_audit_review_status ON reviews;
CREATE TRIGGER tr_audit_review_status
AFTER UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION audit_review_status();

-- ═══════════════ 5. 1년 이상 된 audit log 자동 archive ═══════════════

CREATE OR REPLACE FUNCTION purge_old_audit_logs() RETURNS INTEGER AS $$
DECLARE affected INTEGER;
BEGIN
  DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule(
  'purge-audit-logs',
  '0 20 * * 0',                 -- 매주 일요일 05:00 KST
  $$ SELECT purge_old_audit_logs(); $$
);

COMMENT ON TABLE audit_logs IS 'PRD §14, §16 보안 감사 로그 — 1년 보관';
