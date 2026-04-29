# 🐕 댕로드 (Daengroad)

> 퇴근 후 한적한 펫 외출 — 시간 슬라이더 3시간 → 한적도 87점·펫동반 검증된 충남 근교 즉시 추천
>
> 2026 관광데이터 활용 공모전 ① 웹·앱 개발 부문 출품작

## 모노레포 구조

```
.
├── apps/
│   ├── web/                Next.js 15 (App Router) + Auth.js v5 + Prisma
│   └── api/                Prisma 스키마 + Supabase Edge Functions
├── .github/workflows/      GitHub Actions CI
├── 댕로드_PRD_v1.md        제품 요구사항 정의서
└── daengroad_ui_spec_3.1_main_v0.1.html   메인 화면 UI 명세
```

## 기술 스택 (PRD §10.1)

| 레이어 | 선택 |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript |
| UI | shadcn/ui + Tailwind |
| 상태/폼 | TanStack Query + Zustand + react-hook-form + zod |
| Auth | Auth.js v5 + Supabase Auth (카카오 + 네이버 OAuth) |
| BFF | Server Actions + Prisma (pg adapter) |
| Edge | Supabase Edge Functions (Deno) |
| DB | Supabase Postgres + RLS |
| 캐싱 | Upstash Redis (ETA 24h, Rate Limit) |
| 알림 | Resend (이메일 P0) |
| 관측성 | Sentry + Vercel Analytics + GA4 |
| CI | GitHub Actions + Vercel |

## 개발 환경 셋업

### 1. 사전 요구

- Node.js 20+ (`.nvmrc` 참고, `nvm use` 권장)
- npm 10+
- (선택) Supabase CLI: `brew install supabase/tap/supabase`

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

각 파일의 placeholder 값을 채워주세요. 주요 항목:

- `DATABASE_URL` / `DIRECT_URL` — Supabase Postgres 연결
- `AUTH_SECRET` — `openssl rand -base64 32`
- `AUTH_KAKAO_*` / `AUTH_NAVER_*` — 카카오/네이버 OAuth 시크릿
- `KAKAO_REST_API_KEY` — 카카오 로컬·모빌리티 ETA
- `UPSTASH_REDIS_REST_*` — Upstash 콘솔에서 발급
- `TOUR_API_SERVICE_KEY` — data.go.kr 인증키

### 4. DB 마이그레이션 적용

```bash
cd apps/api
npx prisma migrate deploy   # 16 테이블 + RLS + 트리거 + cron 일괄 적용
npx prisma generate
```

### 5. 개발 서버 시작

```bash
# 프론트
npm run dev:web              # http://localhost:3000

# Supabase 로컬 (선택)
cd apps/api && npx supabase start
npx supabase functions serve --no-verify-jwt
```

## 주요 명령어

| 명령 | 설명 |
|---|---|
| `npm run dev:web` | 프론트 dev 서버 |
| `npm run build:web` | 프론트 빌드 |
| `npm run typecheck` | 전체 워크스페이스 타입체크 |
| `npm run format` | Prettier 일괄 포맷 |
| `npm run format:check` | 포맷 검증 (CI) |
| `npm run analyze -w apps/web` | 번들 분석 (`apps/web/analyze/` 출력) |

## 핵심 PRD 매핑

| 기능 | 파일 |
|---|---|
| F1 시간슬라이더 추천 | `apps/api/supabase/functions/time-slider-recommender/index.ts` |
| F2 한적도 (현재 + 30일 예측) | Edge Function `getQuietness` + `quietness_7d_avg` MV |
| F3 검증 배지 자동 grant | `apps/api/prisma/migrations/0003_badge_auto_grant/` (Postgres 트리거) |
| F4 3줄 근거 칩 | `apps/web/app/page.tsx` `RecommendCard` |
| 일일 추천 이메일 | `apps/api/supabase/functions/daily-recommend-email/index.ts` |
| TourAPI ETL | `apps/api/supabase/functions/tour-api-etl/index.ts` |

## 페이지 구조

```
/                       메인 (시간슬라이더 + 추천 카드)
/login                  카카오/네이버 OAuth
/me                     마이펫타임
  /me/settings          이메일 알림 설정
  /me/pets/new          반려견 등록
/poi/[id]               POI 상세 (시간대별 한적도 차트)
/recommendations        추천 이력
```

## 데이터 모델 (PRD §11)

16개 테이블 전 RLS 활성화. 마이그레이션:

1. `0001_init` — 16 테이블 + 9 enum + 인덱스
2. `0002_rls_policies` — RLS 정책 매트릭스 (PRD §11.5)
3. `0003_badge_auto_grant` — 검증 배지 자동 grant 트리거
4. `0004_pg_cron_setup` — pg_cron + 한적도 MV + 좌표 정리

## 라이선스

Private · 공모전 출품용 (2026 관광데이터 활용 공모전)
