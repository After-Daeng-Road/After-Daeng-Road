# [frontend] SEO·OG 세팅 + README 인트로 영상 미리보기

- **날짜**: 2026-09-06
- **브랜치**: `feature/seo-og-readme-video` (← `dev`)
- **담당**: 프론트엔드
- **상태**: dev 병합 대기

## 주요 변경

### SEO · OG

- `app/opengraph-image.jpg`(+twitter-image, alt) — 인트로 영상 10초 프레임(주인공 폰 속
  댕로드 로고 + 비숑) 1200×630. Next 파일 컨벤션으로 og:image·twitter:image 자동 주입
- `layout.tsx` — **metadataBase**(절대 URL 기준), og:title/description/url,
  twitter summary_large_image, keywords 10종, canonical
- **`app/sitemap.ts` 신설** — robots.ts 가 가리키던 /sitemap.xml 이 실제로는 없던 깨진
  링크 해소. 공개 페이지 + POI 상세 최대 1000건(updatedAt), 하루 1회 revalidate,
  DB 오류 시 정적 경로 폴백
- env: `NEXT_PUBLIC_APP_URL` — env.ts 스키마(optional) + .env.example.
  Vercel Production 에 배포 도메인 값 등록 필요 (미설정 시 daengroad.app 폴백)

### README

- 인트로 섹션 스샷 → **6초 GIF 미리보기 자동재생**(docs/screenshots/intro-preview.gif,
  3.1MB) + 소리 포함 전체 mp4 링크 (GitHub blob 플레이어)

## 검증

- /sitemap.xml 렌더, og:image 절대 URL 주입, twitter:card 출력, OG 이미지 200
- tsc·eslint 클린
