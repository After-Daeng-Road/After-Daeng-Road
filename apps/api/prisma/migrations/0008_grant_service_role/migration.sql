-- 0008_grant_service_role
-- Prisma 로 생성된 public 스키마 객체에 Supabase service_role 권한 부여.
--
-- 배경: Prisma 마이그레이션으로 만든 테이블은 Supabase 기본 role grant 가 자동 적용되지 않아,
--       Edge Function(service_role, RLS 우회 서버 전용)이 "permission denied for table pois"(42501)로 실패한다.
--       Server Actions(Prisma=postgres owner)는 영향 없으나, Edge/service_role 경로는 전부 막힌다.
-- service_role 은 RLS 를 우회하는 서버 전용 role 이므로 스키마 전체 권한 부여가 안전하다.
-- (anon/authenticated 는 RLS 정책으로 통제되며 여기서는 건드리지 않는다 — 0002_rls_policies 참고)

GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 이후 생성되는 객체에도 자동 부여 (postgres role 이 만드는 객체 기준)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
