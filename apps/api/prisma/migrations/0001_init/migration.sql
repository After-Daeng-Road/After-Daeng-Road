-- CreateEnum
CREATE TYPE "PoiType" AS ENUM ('CAFE', 'RESTAURANT', 'TRAIL', 'PARK', 'ATTRACTION', 'ACCOMMODATION', 'REST_AREA');

-- CreateEnum
CREATE TYPE "SyncSource" AS ENUM ('TOUR_API_KOR', 'TOUR_API_PET', 'DATALAB_VISITOR', 'DATALAB_NAVI', 'DATALAB_FORECAST', 'DATALAB_DEMAND', 'DURUNUBI', 'WELLNESS', 'ECO', 'GO_CAMPING', 'USER_UGC');

-- CreateEnum
CREATE TYPE "QuietnessSource" AS ENUM ('DATABANK_VISITOR', 'DATABANK_NAVI', 'FORECAST_30D', 'UGC');

-- CreateEnum
CREATE TYPE "VisitEvaluation" AS ENUM ('QUIET', 'OK', 'CROWDED');

-- CreateEnum
CREATE TYPE "BadgeType" AS ENUM ('PET_VERIFIED', 'WELLNESS', 'ECO', 'TRAIL_OFFICIAL');

-- CreateEnum
CREATE TYPE "RecommendStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLIC', 'HIDDEN_REPORTED', 'REMOVED');

-- CreateEnum
CREATE TYPE "VendorTier" AS ENUM ('FREE', 'FEATURED', 'PREMIUM');

-- CreateEnum
CREATE TYPE "VendorApproval" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "kakao_id" TEXT,
    "naver_id" TEXT,
    "email" TEXT,
    "nickname" TEXT,
    "base_address" TEXT,
    "base_geohash7" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'ko',
    "email_notify_enabled" BOOLEAN NOT NULL DEFAULT false,
    "email_notify_time" TEXT NOT NULL DEFAULT '18:00',
    "email_notify_days" TEXT[] DEFAULT ARRAY['MON', 'TUE', 'WED', 'THU', 'FRI']::TEXT[],
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "breed" TEXT NOT NULL,
    "weight_kg" DECIMAL(4,2) NOT NULL,
    "age_years" INTEGER NOT NULL,
    "restrictions" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pets_sensitive" (
    "id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "allergies" TEXT[],
    "conditions" TEXT[],
    "consented_at" TIMESTAMP(3) NOT NULL,
    "consent_ver" TEXT NOT NULL,

    CONSTRAINT "pets_sensitive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pois" (
    "id" UUID NOT NULL,
    "source" "SyncSource" NOT NULL,
    "source_id" TEXT NOT NULL,
    "content_type_id" INTEGER,
    "name" TEXT NOT NULL,
    "type" "PoiType" NOT NULL,
    "category_1" TEXT,
    "category_2" TEXT,
    "category_3" TEXT,
    "sigungu_code" INTEGER,
    "ldong_code" TEXT,
    "address" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "geohash7" TEXT NOT NULL,
    "image_urls" TEXT[],
    "intro" TEXT,
    "homepage" TEXT,
    "phone" TEXT,
    "pet_allowed" BOOLEAN NOT NULL DEFAULT false,
    "pet_size_max_kg" INTEGER,
    "pet_indoor" BOOLEAN,
    "pet_outdoor" BOOLEAN,
    "pet_policy_text" TEXT,
    "is_wellness" BOOLEAN NOT NULL DEFAULT false,
    "is_eco" BOOLEAN NOT NULL DEFAULT false,
    "last_synced_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pois_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "durunubi_courses" (
    "id" UUID NOT NULL,
    "poi_id" UUID,
    "route_idx" TEXT NOT NULL,
    "route_name" TEXT NOT NULL,
    "theme_name" TEXT,
    "total_distance_km" DECIMAL(6,2) NOT NULL,
    "total_elevation_m" INTEGER,
    "estimated_min" INTEGER,
    "difficulty_level" INTEGER,
    "path_geojson" JSONB,
    "image_urls" TEXT[],
    "description" TEXT,
    "last_synced_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "durunubi_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quietness_scores" (
    "id" UUID NOT NULL,
    "poi_id" UUID,
    "sigungu_code" INTEGER NOT NULL,
    "weekday" INTEGER NOT NULL,
    "hour_slot" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "source" "QuietnessSource" NOT NULL,
    "sample_size" INTEGER,
    "computed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quietness_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poi_forecasts" (
    "id" UUID NOT NULL,
    "poi_id" UUID NOT NULL,
    "forecast_date" DATE NOT NULL,
    "expected_score" INTEGER NOT NULL,
    "expected_visitors" INTEGER,
    "confidence" DECIMAL(3,2),
    "computed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poi_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demand_indices" (
    "id" UUID NOT NULL,
    "sigungu_code" INTEGER NOT NULL,
    "period_month" TEXT NOT NULL,
    "resource_demand" DECIMAL(6,2),
    "demand_intensity" DECIMAL(6,2),
    "diversity" DECIMAL(6,2),
    "computed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demand_indices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" UUID NOT NULL,
    "poi_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "visited_at" TIMESTAMP(3) NOT NULL,
    "photo_url" TEXT,
    "evaluation" "VisitEvaluation" NOT NULL,
    "exif_lat" DOUBLE PRECISION,
    "exif_lng" DOUBLE PRECISION,
    "exif_at" TIMESTAMP(3),
    "is_valid" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" UUID NOT NULL,
    "poi_id" UUID NOT NULL,
    "badge_type" "BadgeType" NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "pet_id" UUID,
    "status" "RecommendStatus" NOT NULL DEFAULT 'PENDING',
    "departure_lat" DOUBLE PRECISION NOT NULL,
    "departure_lng" DOUBLE PRECISION NOT NULL,
    "departure_geohash7" TEXT NOT NULL,
    "time_hours" INTEGER NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "results_json" JSONB,
    "reason_chips" JSONB,
    "request_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "poi_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT,
    "photos" TEXT[],
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLIC',
    "report_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_replies" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "biz_number" TEXT NOT NULL,
    "biz_account" TEXT,
    "name" TEXT NOT NULL,
    "type" "PoiType" NOT NULL,
    "poi_id" UUID,
    "approval_status" "VendorApproval" NOT NULL DEFAULT 'PENDING',
    "premium_tier" "VendorTier" NOT NULL DEFAULT 'FREE',
    "pet_policy" JSONB,
    "image_urls" TEXT[],
    "description" TEXT,
    "hours" JSONB,
    "contact" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID,
    "session_id" TEXT,
    "event" TEXT NOT NULL,
    "props" JSONB,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT,
    "status" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3),
    "opened_at" TIMESTAMP(3),
    "clicked_at" TIMESTAMP(3),
    "external_id" TEXT,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_api_sync_logs" (
    "id" BIGSERIAL NOT NULL,
    "dataset" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "count_added" INTEGER NOT NULL DEFAULT 0,
    "count_updated" INTEGER NOT NULL DEFAULT 0,
    "count_removed" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "error_message" TEXT,

    CONSTRAINT "tour_api_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_kakao_id_key" ON "users"("kakao_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_naver_id_key" ON "users"("naver_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_base_geohash7_idx" ON "users"("base_geohash7");

-- CreateIndex
CREATE INDEX "pets_user_id_idx" ON "pets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "pets_sensitive_pet_id_key" ON "pets_sensitive"("pet_id");

-- CreateIndex
CREATE INDEX "pois_sigungu_code_type_idx" ON "pois"("sigungu_code", "type");

-- CreateIndex
CREATE INDEX "pois_geohash7_idx" ON "pois"("geohash7");

-- CreateIndex
CREATE INDEX "pois_pet_allowed_idx" ON "pois"("pet_allowed");

-- CreateIndex
CREATE INDEX "pois_type_lat_lng_idx" ON "pois"("type", "lat", "lng");

-- CreateIndex
CREATE UNIQUE INDEX "pois_source_source_id_key" ON "pois"("source", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "durunubi_courses_poi_id_key" ON "durunubi_courses"("poi_id");

-- CreateIndex
CREATE UNIQUE INDEX "durunubi_courses_route_idx_key" ON "durunubi_courses"("route_idx");

-- CreateIndex
CREATE INDEX "quietness_scores_poi_id_idx" ON "quietness_scores"("poi_id");

-- CreateIndex
CREATE UNIQUE INDEX "quietness_scores_sigungu_code_weekday_hour_slot_source_poi__key" ON "quietness_scores"("sigungu_code", "weekday", "hour_slot", "source", "poi_id");

-- CreateIndex
CREATE INDEX "poi_forecasts_forecast_date_idx" ON "poi_forecasts"("forecast_date");

-- CreateIndex
CREATE UNIQUE INDEX "poi_forecasts_poi_id_forecast_date_key" ON "poi_forecasts"("poi_id", "forecast_date");

-- CreateIndex
CREATE UNIQUE INDEX "demand_indices_sigungu_code_period_month_key" ON "demand_indices"("sigungu_code", "period_month");

-- CreateIndex
CREATE INDEX "verifications_poi_id_idx" ON "verifications"("poi_id");

-- CreateIndex
CREATE INDEX "verifications_user_id_idx" ON "verifications"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "verifications_poi_id_user_id_visited_at_key" ON "verifications"("poi_id", "user_id", "visited_at");

-- CreateIndex
CREATE UNIQUE INDEX "badges_poi_id_badge_type_key" ON "badges"("poi_id", "badge_type");

-- CreateIndex
CREATE INDEX "recommendations_user_id_request_at_idx" ON "recommendations"("user_id", "request_at");

-- CreateIndex
CREATE INDEX "reviews_poi_id_idx" ON "reviews"("poi_id");

-- CreateIndex
CREATE INDEX "reviews_user_id_idx" ON "reviews"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_replies_review_id_key" ON "vendor_replies"("review_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_owner_user_id_key" ON "vendors"("owner_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_biz_number_key" ON "vendors"("biz_number");

-- CreateIndex
CREATE INDEX "vendors_approval_status_idx" ON "vendors"("approval_status");

-- CreateIndex
CREATE INDEX "analytics_events_event_ts_idx" ON "analytics_events"("event", "ts");

-- CreateIndex
CREATE INDEX "analytics_events_user_id_ts_idx" ON "analytics_events"("user_id", "ts");

-- CreateIndex
CREATE INDEX "email_logs_user_id_sent_at_idx" ON "email_logs"("user_id", "sent_at");

-- CreateIndex
CREATE INDEX "tour_api_sync_logs_dataset_started_at_idx" ON "tour_api_sync_logs"("dataset", "started_at");

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pets_sensitive" ADD CONSTRAINT "pets_sensitive_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "durunubi_courses" ADD CONSTRAINT "durunubi_courses_poi_id_fkey" FOREIGN KEY ("poi_id") REFERENCES "pois"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quietness_scores" ADD CONSTRAINT "quietness_scores_poi_id_fkey" FOREIGN KEY ("poi_id") REFERENCES "pois"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poi_forecasts" ADD CONSTRAINT "poi_forecasts_poi_id_fkey" FOREIGN KEY ("poi_id") REFERENCES "pois"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_poi_id_fkey" FOREIGN KEY ("poi_id") REFERENCES "pois"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badges" ADD CONSTRAINT "badges_poi_id_fkey" FOREIGN KEY ("poi_id") REFERENCES "pois"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_poi_id_fkey" FOREIGN KEY ("poi_id") REFERENCES "pois"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_replies" ADD CONSTRAINT "vendor_replies_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_replies" ADD CONSTRAINT "vendor_replies_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_poi_id_fkey" FOREIGN KEY ("poi_id") REFERENCES "pois"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

