-- 댕로드 — 이용약관/개인정보/위치/마케팅 동의 이력 (PRD §14, §14.2)
-- 동의 이력(append-only) 전용 테이블. (user_id, kind) 별 최신 recorded_at 행이 현재 상태.
-- pets_sensitive(펫 헬스, 펫 단위 동의)와 별개로 계정 단위 동의를 버전과 함께 추적한다.
-- Prisma 는 스키마(모델)만 관리, 테이블 DDL·RLS·grant 는 이 SQL 로 적용 (0006/0008 컨벤션).

-- ═══════════════ 1. enum ═══════════════
DO $$ BEGIN
  CREATE TYPE "ConsentKind" AS ENUM ('TERMS', 'PRIVACY', 'LOCATION', 'MARKETING_EMAIL', 'PET_HEALTH');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ═══════════════ 2. user_consents 테이블 ═══════════════
CREATE TABLE IF NOT EXISTS "user_consents" (
  "id"          UUID NOT NULL,
  "user_id"     UUID NOT NULL,
  "kind"        "ConsentKind" NOT NULL,
  "version"     TEXT NOT NULL,
  "agreed"      BOOLEAN NOT NULL DEFAULT true,
  "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip_address"  INET,
  "user_agent"  TEXT,

  CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "user_consents_user_id_kind_recorded_at_idx"
  ON "user_consents" ("user_id", "kind", "recorded_at" DESC);

ALTER TABLE "user_consents"
  ADD CONSTRAINT "user_consents_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═══════════════ 3. RLS — 본인만, append-only (SELECT/INSERT 만; UPDATE/DELETE 정책 없음) ═══════════════
ALTER TABLE "user_consents" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_consents_select_self" ON "user_consents" FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "user_consents_insert_self" ON "user_consents" FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════ 4. service_role grant (0008 컨벤션 — 신규 테이블 명시 부여) ═══════════════
GRANT ALL ON TABLE "user_consents" TO service_role;

COMMENT ON TABLE "user_consents" IS 'PRD §14.2 동의 이력 — 약관/개인정보/위치/마케팅, 버전별 append-only';
