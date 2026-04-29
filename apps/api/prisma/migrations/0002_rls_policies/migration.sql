-- 댕로드 RLS 정책 (PRD v1.0.5 §11.5)
-- Prisma는 스키마만 관리, RLS는 별도 SQL로 적용
-- auth.uid() 는 Supabase Auth가 주입하는 현재 사용자 UUID

-- ═══════════════ 1. RLS 활성화 ═══════════════

ALTER TABLE "users"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pets"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pets_sensitive"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pois"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "durunubi_courses"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quietness_scores"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "poi_forecasts"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "demand_indices"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verifications"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "badges"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recommendations"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vendor_replies"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vendors"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analytics_events"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_logs"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tour_api_sync_logs"   ENABLE ROW LEVEL SECURITY;

-- ═══════════════ 2. users — 본인 + 서비스 ═══════════════

CREATE POLICY "users_select_self" ON "users" FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "users_update_self" ON "users" FOR UPDATE
  USING (auth.uid() = id);
CREATE POLICY "users_delete_self" ON "users" FOR DELETE
  USING (auth.uid() = id);

-- ═══════════════ 3. pets — 본인만 ═══════════════

CREATE POLICY "pets_owner_all" ON "pets" FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════ 4. pets_sensitive — 본인만 (펫 헬스, 분리 명시 동의) ═══════════════

CREATE POLICY "pets_sensitive_owner_all" ON "pets_sensitive" FOR ALL
  USING (
    auth.uid() = (SELECT user_id FROM pets WHERE pets.id = pets_sensitive.pet_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM pets WHERE pets.id = pets_sensitive.pet_id)
  );

-- ═══════════════ 5. pois / durunubi_courses — 공개 read ═══════════════

CREATE POLICY "pois_public_read"             ON "pois"             FOR SELECT USING (true);
CREATE POLICY "durunubi_courses_public_read" ON "durunubi_courses" FOR SELECT USING (true);

-- ═══════════════ 6. quietness / poi_forecasts / demand_indices — 공개 read ═══════════════

CREATE POLICY "quietness_public_read" ON "quietness_scores" FOR SELECT USING (true);
CREATE POLICY "forecast_public_read"  ON "poi_forecasts"    FOR SELECT USING (true);
CREATE POLICY "demand_public_read"    ON "demand_indices"   FOR SELECT USING (true);

-- ═══════════════ 7. verifications — 공개 read · 본인 write ═══════════════

CREATE POLICY "verif_public_read" ON "verifications" FOR SELECT USING (true);
CREATE POLICY "verif_owner_write" ON "verifications" FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "verif_owner_update" ON "verifications" FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "verif_owner_delete" ON "verifications" FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════ 8. badges — 공개 read (write 는 서비스/admin) ═══════════════

CREATE POLICY "badges_public_read" ON "badges" FOR SELECT USING (true);

-- ═══════════════ 9. recommendations — 본인만 ═══════════════

CREATE POLICY "rec_owner_all" ON "recommendations" FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════ 10. reviews — 공개 read · 본인 write ═══════════════

CREATE POLICY "reviews_public_read" ON "reviews" FOR SELECT
  USING (status = 'PUBLIC' OR auth.uid() = user_id);
CREATE POLICY "reviews_owner_insert" ON "reviews" FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_owner_update" ON "reviews" FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "reviews_owner_delete" ON "reviews" FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════ 11. vendor_replies — 공개 read · vendor 본인 write ═══════════════

CREATE POLICY "vreplies_public_read" ON "vendor_replies" FOR SELECT USING (true);
CREATE POLICY "vreplies_owner_write" ON "vendor_replies" FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT owner_user_id FROM vendors WHERE vendors.id = vendor_replies.vendor_id)
  );
CREATE POLICY "vreplies_owner_update" ON "vendor_replies" FOR UPDATE
  USING (
    auth.uid() = (SELECT owner_user_id FROM vendors WHERE vendors.id = vendor_replies.vendor_id)
  );

-- ═══════════════ 12. vendors — 공개(승인됨만) + 본인(전체) ═══════════════

CREATE POLICY "vendors_public_read_approved" ON "vendors" FOR SELECT
  USING (approval_status = 'APPROVED' OR auth.uid() = owner_user_id);
CREATE POLICY "vendors_owner_insert" ON "vendors" FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "vendors_owner_update" ON "vendors" FOR UPDATE
  USING (auth.uid() = owner_user_id);

-- ═══════════════ 13. analytics_events / email_logs / tour_api_sync_logs ═══════════════
-- 운영자/서비스 권한만 (RLS 정책 미정의 = 일반 사용자 접근 불가)
-- email_logs는 본인 SELECT 허용

CREATE POLICY "email_logs_owner_read" ON "email_logs" FOR SELECT
  USING (auth.uid() = user_id);
