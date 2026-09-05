-- 0014 — UUID 기본키 및 updated_at 에 컬럼 DEFAULT 부여
--
-- 배경:
--   Prisma 의 @default(uuid()) / @updatedAt 은 Prisma Client 가 채워 넣는 클라이언트 기능이라
--   생성되는 SQL 에는 반영되지 않는다. 따라서 Prisma 를 거치지 않는 경로 —
--   CLAUDE.md 규칙에 따라 supabase-js 를 쓰는 Supabase Edge Functions — 에서 INSERT 하면
--   id / updated_at 이 NULL 이 되어 NOT NULL 제약에 걸려 전부 실패했다.
--
--   Edge 쪽에는 crypto.randomUUID() 로 값을 명시하도록 고쳤으나(같은 PR),
--   같은 실수가 재발하지 않도록 DB 레벨에도 기본값을 둔다. 이중 방어다.
--
-- 주의:
--   tour_api_sync_logs.id 는 BIGSERIAL 이라 이미 기본값이 있으므로 대상이 아니다.
--   gen_random_uuid() 는 pgcrypto 확장이 제공하며 0004 에서 이미 설치되어 있다.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 기본키 UUID 자동 생성
ALTER TABLE "pois"            ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "recommendations" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "email_logs"      ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- pois.updated_at 은 NOT NULL 인데 기본값이 없어 INSERT 시 함께 실패했다
ALTER TABLE "pois"            ALTER COLUMN "updated_at" SET DEFAULT now();
