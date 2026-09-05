-- 0015 — durunubi_courses 를 코스 단위 키로 교정
--
-- 배경:
--   두루누비 API 는 노선(routeIdx)과 코스(crsIdx)를 분리해 제공한다.
--   routeIdx 는 남파랑길·서해랑길·DMZ 평화의 길·해파랑길 4개뿐이고,
--   실제 코스는 crsIdx 로 식별되며 전국 142건이다.
--
--   0001 은 route_idx 에 UNIQUE 를 걸고 crs_idx 컬럼을 두지 않았다.
--   그 상태로는 최대 4행만 저장되고 다섯 번째 코스부터 유니크 위반으로 실패한다.
--
-- 조치:
--   crs_idx 를 추가해 UNIQUE 를 옮기고, route_idx 는 조회용 인덱스로 남긴다.
--   route_name 은 실제로 코스명(crsKorNm)을 담으므로 crs_name 으로 바로잡는다.
--   (노선명은 theme_name 이 담는다)
--
-- 주의:
--   crs_idx 를 NOT NULL 로 바로 추가하므로, 기존 행이 있으면 이 마이그레이션은 실패한다.
--   현재 이 테이블에 쓰기 경로가 없어 비어 있는 것이 정상이며,
--   행이 있다면 값 없이 채울 수 없으므로 조용히 넘어가지 않고 실패하는 편이 맞다.

ALTER TABLE "durunubi_courses" ADD COLUMN "crs_idx" TEXT NOT NULL;
ALTER TABLE "durunubi_courses" ADD COLUMN "sigun_text" TEXT;
ALTER TABLE "durunubi_courses" ADD COLUMN "gpx_path" TEXT;

ALTER TABLE "durunubi_courses" RENAME COLUMN "route_name" TO "crs_name";

DROP INDEX "durunubi_courses_route_idx_key";
CREATE UNIQUE INDEX "durunubi_courses_crs_idx_key" ON "durunubi_courses"("crs_idx");
CREATE INDEX "durunubi_courses_route_idx_idx" ON "durunubi_courses"("route_idx");
