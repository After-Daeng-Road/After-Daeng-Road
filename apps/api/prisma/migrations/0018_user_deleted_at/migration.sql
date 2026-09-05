-- 0018 — 회원 탈퇴 (소프트 삭제 + 30일 후 완전 파기)
--
-- 배경:
--   개인정보처리방침은 "회원 탈퇴 시 즉시 삭제(분쟁 대비 30일 보관 후 완전 파기)"를
--   이용자에게 고지하고 있는데, 탈퇴 기능 자체가 레포에 없었다.
--   이행 불가능한 약속을 고지한 상태였다(개인정보보호법 §21 파기, §36 삭제 요구권).
--
-- 왜 즉시 완전 삭제가 아닌가:
--   users 와 연결된 전 관계가 onDelete: Cascade 다. 행을 지우면 공개 후기까지 사라져
--   다른 이용자가 읽던 커뮤니티 콘텐츠가 소급 삭제된다.
--   탈퇴 시점에 식별정보(email·provider id·닉네임·기준 좌표)를 즉시 비워 재식별을 끊고,
--   30일 뒤 행 자체를 파기한다. 방침이 고지한 절차와 일치한다.

ALTER TABLE "users" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- 탈퇴 계정 조회용 (파기 크론이 매일 훑는다)
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- ═══ 30일 경과 계정 완전 파기 ═══
CREATE OR REPLACE FUNCTION purge_deleted_users()
RETURNS INTEGER AS $$
DECLARE
  purged INTEGER;
BEGIN
  WITH del AS (
    DELETE FROM users
    WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - INTERVAL '30 days'
    RETURNING 1
  )
  SELECT COUNT(*) INTO purged FROM del;
  RETURN purged;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION purge_deleted_users() IS
  '탈퇴 후 30일 경과 계정 완전 파기 (개인정보처리방침 고지 절차)';

-- 매일 03:10 KST = 18:10 UTC
DO $$
BEGIN
  PERFORM cron.unschedule('users-purge-deleted');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'users-purge-deleted 미등록 — 건너뜀';
END $$;

SELECT cron.schedule(
  'users-purge-deleted',
  '10 18 * * *',
  $$ SELECT purge_deleted_users(); $$
);
