-- 댕로드 — 북마크(저장한 장소) 테이블 (PRD §7.2 [마이펫타임])
-- 저장 단위: Poi(poiId). (user_id, poi_id) unique — 토글 시 존재하면 delete, 없으면 create.
-- service_role 권한은 0008_grant_service_role 의 ALTER DEFAULT PRIVILEGES 로 신규 테이블에 자동 부여된다.

-- CreateTable
CREATE TABLE "bookmarks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "poi_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_user_id_poi_id_key" ON "bookmarks"("user_id", "poi_id");
CREATE INDEX "bookmarks_user_id_created_at_idx" ON "bookmarks"("user_id", "created_at" DESC);
CREATE INDEX "bookmarks_poi_id_idx" ON "bookmarks"("poi_id");

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_poi_id_fkey" FOREIGN KEY ("poi_id") REFERENCES "pois"("id") ON DELETE CASCADE ON UPDATE CASCADE;
