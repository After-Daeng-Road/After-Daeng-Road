-- 0022 — poi_forecasts.id 에 DB 기본값 부여
--
-- 배경:
--   Prisma 의 @default(uuid()) 는 클라이언트 측 기본값이라 DB 컬럼에는 DEFAULT 가 없다.
--   Prisma 를 통하지 않는 경로(Edge Function 의 supabase-js, raw SQL)는 id 를 직접 넣어야 하고,
--   빠뜨리면 NOT NULL 위반으로 실패한다. email_logs 가 같은 이유로 0014 에서 문제를 겪었다.
--
--   특히 upsert 에서 아프다. id 를 페이로드에 넣으면 ON CONFLICT DO UPDATE 가 기존 행의
--   기본키까지 매일 새 값으로 바꿔 인덱스를 무의미하게 흔든다. DB 기본값이 있으면
--   id 를 아예 빼고 쓸 수 있어 삽입 때만 생성되고 갱신 때는 보존된다.
--
--   pgcrypto 는 Supabase 에 기본 설치되어 있다(gen_random_uuid 는 PG13+ 코어에도 있다).

alter table public.poi_forecasts
  alter column id set default gen_random_uuid();
