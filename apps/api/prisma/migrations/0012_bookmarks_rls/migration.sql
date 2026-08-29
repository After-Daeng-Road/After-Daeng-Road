-- 댕로드 bookmarks RLS (PRD §11.5, 0002 스타일) — recommendations 와 동일: 본인만
ALTER TABLE "bookmarks" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookmarks_owner_all" ON "bookmarks" FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- service_role grant 는 0008_grant_service_role 의 ALTER DEFAULT PRIVILEGES 로 자동 부여됨(추가 grant 불필요)
