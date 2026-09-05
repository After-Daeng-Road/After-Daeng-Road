-- 0019 — 탈퇴 파기 로직 교정
--
-- ═══ 0018 의 잘못 ═══
-- purge_deleted_users() 가 30일 뒤 DELETE FROM users 를 했다.
-- users 를 참조하는 FK 8개가 전부 ON DELETE CASCADE 라(0001:409~454, 0010:30, 0011:21)
-- 그 한 줄이 후기·사장님 답글·벤더 등록·북마크·이메일 로그를 연쇄 삭제한다.
--
-- 소프트 딜리트를 택한 이유가 "행을 지우면 공개 후기까지 사라진다" 였는데,
-- 30일 뒤에 정확히 그 일을 하고 있었다. 문제를 해결한 게 아니라 미룬 것이다.
--
-- ═══ 왜 행을 남겨도 되는가 ═══
-- 탈퇴 시 email·kakao_id·naver_id·google_id·nickname·base_address·base_geohash7 을
-- 모두 비운다(lib/actions/account.ts). 남는 컬럼은
--   id(UUID) · locale · email_notify_* · role · deleted_at · created_at · updated_at
-- 뿐이고 어느 것도 개인을 식별하지 못한다. 재식별 키가 존재하지 않으므로
-- 개인정보보호법 §21 이 말하는 파기 대상 개인정보가 아니다. 익명 행은 남겨도 된다.
--
-- ═══ 대신 진짜 지워야 할 것 ═══
-- user_consents 에 ip_address(INET) 와 user_agent(TEXT) 가 있다(0010:19-20). IP 는 개인정보다.
-- 행을 지우지 않기로 했으므로 이 두 컬럼이 영구히 남게 된다.
-- 분쟁 대비 30일 보관이라는 명분은 타당하니, 그 기간이 지나면 두 컬럼만 비운다.
-- 동의 사실·종류·약관 버전·시각은 남아 증빙 가치를 유지한다.

DROP FUNCTION IF EXISTS purge_deleted_users();

CREATE OR REPLACE FUNCTION anonymize_expired_consent_traces()
RETURNS INTEGER AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE user_consents c
     SET ip_address = NULL,
         user_agent = NULL
    FROM users u
   WHERE c.user_id = u.id
     AND u.deleted_at IS NOT NULL
     AND u.deleted_at < NOW() - INTERVAL '30 days'
     AND (c.ip_address IS NOT NULL OR c.user_agent IS NOT NULL);
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION anonymize_expired_consent_traces() IS
  '탈퇴 30일 경과 계정의 동의 이력에서 IP·User-Agent 제거. 동의 사실과 약관 버전은 보존';

-- 잡 교체: users 행 삭제 → 동의 이력 흔적 제거
DO $$
BEGIN
  PERFORM cron.unschedule('users-purge-deleted');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'users-purge-deleted 미등록 — 건너뜀';
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('consents-anonymize-expired');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'consents-anonymize-expired 미등록 — 건너뜀';
END $$;

-- 매일 03:10 KST = 18:10 UTC
SELECT cron.schedule(
  'consents-anonymize-expired',
  '10 18 * * *',
  $$ SELECT anonymize_expired_consent_traces(); $$
);
