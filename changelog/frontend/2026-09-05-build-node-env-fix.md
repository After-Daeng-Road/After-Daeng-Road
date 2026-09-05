# [frontend] Vercel 빌드 실패 수정 + Node engines 가드

- **날짜**: 2026-09-05
- **브랜치**: `feature/vercel-build-fix`(PR #13) · `chore/node-engines-guard`(PR #15) — 병합 완료
- **담당**: 프론트엔드
- **상태**: dev 병합 완료 + main 릴리스(714d7b0) 반영

## 개요

Vercel 첫 배포 실패와 로컬 후기 등록 500, 두 건 모두 환경 문제로 판명되어 함께 처리.

## 1. Vercel 빌드 실패 (PR #13)

- **원인**: CI 클린 설치에선 생성된 Prisma 클라이언트가 없어 `next build`가 타입 스텁으로
  컴파일하다 실패 (로컬은 수동 `prisma generate` 산출물이 남아 있어 재현 안 됐음).
  main 스냅샷 클린 빌드로 재현 확인.
- **수정**:
  - `apps/web` build: `prisma generate --schema=../api/prisma/schema.prisma && next build`
  - `apps/web` devDep 에 prisma CLI 추가 + lockfile 갱신
  - root `prepare`: `husky || true` — git 컨텍스트 없는 CI 설치 중단 방지
- **검증**: 임시 워크트리 클린 설치 + `npm run build:web` 통과 (env 미설정 — env 검증 lazy)

## 2. Node engines 가드 (PR #15)

- **원인**: 후기 등록 500 — `isomorphic-dompurify` → `jsdom@28` → `html-encoding-sniffer@6`이
  ESM 전용 모듈을 CJS `require()`로 로드 → **Node 22.12+ 필요**(require(esm)). Node 22.11 에서
  `ERR_REQUIRE_ESM` 으로 액션 모듈 로드 실패.
- **수정**: engines `">=20.19.0 <21 || >=22.12.0"` — 문제 버전으로 `npm install` 시 즉시 차단.
  (.nvmrc=20 은 20.20.2 로 충족)
- **로컬 환경 조치**(레포 외): nvm default 22.22.2, `.env.local` DATABASE_URL 중복 제거
  (로컬 supabase 줄 주석 처리 — 호스티드 단일화)

## 함께 릴리스된 것

- dev → main 머지(714d7b0): QA #9·#10, 사진업로드 #11, 동의 UI #12, 빌드픽스 #13

## 남은 것 / 후속

- Vercel 프로젝트 env 설정 후 재배포 확인 (필수 env 목록은 `lib/env.ts` serverSchema 참고)
- 추천 이력 미기록 버그(백엔드): edge fn `recommendations` INSERT 가 `id` 미지정 + 에러 미확인으로
  조용히 실패 — `id: crypto.randomUUID()` 또는 DB default 필요. 백엔드 전달 예정
