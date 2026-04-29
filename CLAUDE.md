# CLAUDE.md — 댕로드 프로젝트 가이드

이 파일은 Claude Code 등 AI 어시스턴트가 이 레포에서 작업할 때 따라야 할 컨벤션입니다.

## 프로젝트 컨텍스트

- 2026 관광데이터 활용 공모전 ① 웹·앱 개발 부문 출품작
- 메인 카피: "퇴근 후 한적한 펫 외출"
- 1차 베타 지역: 충남 4시 (공주·천안·아산·서산)
- PRD 원본: `댕로드_PRD_v1.md`
- 메인 화면 UI 명세: `daengroad_ui_spec_3.1_main_v0.1.html`

## 모노레포 구조

```
apps/web/   Next.js 15 + Auth.js v5 + Prisma + shadcn/ui
apps/api/   Prisma schema + Supabase Edge Functions (Deno)
```

워크스페이스별 `.env` 파일은 분리되어 있고, 동일 시크릿이 양쪽에 중복되는 것은 정상입니다 (Vercel/Supabase 배포가 분리되기 때문).

## 핵심 ORM 운용 규칙 (PRD §10.2)

- **Server Actions** (Next.js 측): Prisma + pg driver adapter 사용
- **Edge Functions** (Supabase 측): Prisma ✗ → `@supabase/supabase-js` 또는 raw SQL 사용
- 이유: Edge 콜드스타트·번들 크기 회피

## Auth.js v5 분리 원칙

- `apps/web/auth.config.ts` — Edge Runtime 호환 (DB 어댑터 ✗)
- `apps/web/auth.ts` — 풀 구성 (SupabaseAdapter 포함)
- `apps/web/middleware.ts` — `auth.config.ts` 만 import

DB 어댑터를 미들웨어에서 import하면 Edge Runtime 빌드 실패합니다.

## 시크릿 관리

- 절대로 `.env`, `.env.local`을 커밋하지 마세요 (`.gitignore`에 등록됨)
- `.env.example`은 템플릿이라 커밋 OK
- 시크릿 노출 시 즉시 회전: 카카오 시크릿 / Supabase service_role / Upstash 토큰

## 코딩 컨벤션

- **포맷**: Prettier (`.prettierrc.json`) — `npm run format`
- **타입**: 모든 새 파일은 strict TypeScript
- **컴포넌트**: shadcn/ui 표준 사용 (`components/ui/`), `cn()` 헬퍼로 className 병합
- **Server Actions**: `'use server'` 디렉티브 + zod 검증 + `auth()` 인증 체크 + `revalidatePath`
- **Edge Functions**: Deno URL imports + `Deno.serve` + CORS 헤더 + Service Role 사용 시 명확한 RLS 우회 의도 주석

## 마이그레이션 관리

- Prisma 스키마 변경 시 `npx prisma format` + `npx prisma migrate diff` 로 SQL 생성
- RLS 정책 / 트리거 / pg_cron 은 별도 SQL 마이그레이션 파일로 추가 (Prisma는 스키마만 관리)
- 운영 적용은 `npx prisma migrate deploy`

## PRD 변경 시

PRD 본문은 진실의 원천입니다. 코드와 PRD가 충돌하면:
1. 원래 의도가 PRD에 있는지 먼저 확인
2. 코드 잘못이면 코드 수정
3. PRD 잘못이면 사용자에게 알리고 PRD 업데이트 후 코드 반영

## 작업 시 필수 체크

- [ ] 환경 변수 추가 시 `lib/env.ts` 스키마 + `.env.example` 양쪽 업데이트
- [ ] DB 스키마 변경 시 마이그레이션 + 시드 함께 업데이트
- [ ] Server Action 추가 시 zod 입력 검증 필수
- [ ] 외부 API 호출 시 캐시·Rate Limit·실패 핸들링 (PRD §13.5)
- [ ] 위치 정보 다룰 때 PRD §14 개인정보 보호 정책 준수

## 충남 시드 코드 (PRD §13.3)

| 시·군 | sigunguCode |
|---|---|
| 공주 | 33020 |
| 천안 | 33040 |
| 아산 | 33050 |
| 서산 | 33150 |

## 참고 문서

- [Auth.js v5 마이그레이션](https://authjs.dev/getting-started/migrating-to-v5)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Prisma + pg adapter](https://www.prisma.io/docs/orm/overview/databases/postgresql/postgresql-driver-adapters)
- [한국관광 콘텐츠랩 (TourAPI)](https://api.visitkorea.or.kr/)
- [한국관광 데이터랩](https://datalab.visitkorea.or.kr/)
