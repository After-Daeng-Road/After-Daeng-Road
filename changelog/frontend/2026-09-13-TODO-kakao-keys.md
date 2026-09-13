# [frontend][TODO] 카카오 키 발급·등록 — 산책로 지도 + 추천 실도로 ETA

- **날짜**: 2026-09-13
- **담당**: 프론트엔드 (본인 카카오 계정으로 발급)
- **상태**: **미완료.** 현재 `apps/web/.env.local`의 `NEXT_PUBLIC_KAKAO_JS_KEY`·`KAKAO_REST_API_KEY` 둘 다 비어 있음

## 왜 필요한가

- **JS 키가 없어서** 산책로 미리보기가 카카오맵이 아니라 SVG 스케치로 뜬다. 키만 넣으면 코드 변경 없이 지도 위 경로로 바뀐다
  (`components/trails/trail-card.tsx`가 키 유무로 분기).
- **REST 키가 없어서** 추천 카드의 거리·편도 시간이 직선거리 × 1.3 추정값이다. 키를 넣으면 Edge 함수가 카카오모빌리티 길찾기로
  실제 도로 시간을 쓰고, Upstash에 24시간 캐시해 호출량을 통제한다.

두 키 모두 `.env.example`과 `lib/env.ts` 스키마에 이미 정의되어 있어 코드 작업은 없다.

## 발급 (카카오 디벨로퍼스, 본인 계정)

- [ ] https://developers.kakao.com → 내 애플리케이션 → 앱 생성(이미 있으면 그것 사용)
- [ ] 앱 키에서 두 개 복사
  - **JavaScript 키** — 브라우저에서 지도를 그릴 때 (공개돼도 되는 키, 도메인으로 보호)
  - **REST API 키** — 서버에서 ETA를 물어볼 때 (**서버 전용, 프론트 노출 금지**)
- [ ] 플랫폼 → Web 에 `http://localhost:3000` 과 배포 도메인(`https://daengroad.app` 또는 Vercel 주소) 등록.
      없으면 JS 키 호출이 거부된다
- [ ] 제품 설정 → **카카오맵** 활성화
- [ ] REST 키로 ETA를 쓰려면 **카카오모빌리티 길찾기 API**를 https://developers.kakaomobility.com 에서 별도 신청.
      같은 REST 키를 쓰지만 서비스 신청이 따로다

## 등록 (세 곳)

| 위치 | 키 | 담당 |
|---|---|---|
| `apps/web/.env.local` | `NEXT_PUBLIC_KAKAO_JS_KEY`, `KAKAO_REST_API_KEY` | 본인 |
| Vercel 환경변수 (Production·Preview) | 위와 같은 두 개 | 본인 (Vercel 대시보드) |
| Supabase Edge 시크릿 | `KAKAO_REST_API_KEY` | 백엔드 — `2026-09-13-TODO-edge-deploy-request.md` 의 `secrets set` 줄 |

- [ ] `.env.local` 등록 후 dev 서버 재시작 (`NEXT_PUBLIC_*`는 빌드 시 인라인되므로 재시작 필수)
- [ ] Vercel 등록 후 재배포
- [ ] 백엔드에 REST 키 전달

## 확인

- [ ] `/trails` 카드에서 [미리보기] → 카카오맵 타일 위에 살몬색 경로 + 출발·도착 마커.
      타일이 회색이면 CSP 문제 — `next.config.mjs` `img-src`에 `*.daumcdn.net`은 이미 허용되어 있으니 콘솔 오류 확인
- [ ] 홈 추천 카드의 "편도 N분"이 직선거리 계산값과 달라지면 REST 키 적용 성공
      (같은 출발지·장소로 등록 전후 비교. 24시간 캐시라 즉시 반영은 새 장소에서만)

## 참고

- 카카오모빌리티 길찾기는 무료 쿼터가 있고 24h 캐시로 출발지 geohash × 장소 단위로 재사용된다 (PRD §13.5)
- JS 키는 `NEXT_PUBLIC_` 접두사라 번들에 포함되는 것이 정상. 도메인 등록이 방어선이다
