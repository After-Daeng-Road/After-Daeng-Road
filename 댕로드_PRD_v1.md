# 펫타임(가칭) — Product Requirements Document v1.0

> 퇴근 후 3시간, 한적하고 펫 친화적인 동네/근교를 즉시 추천
> 2026 관광데이터 활용 공모전 — ① 웹·앱 개발 부문

| 항목      | 내용                                                           |
| --------- | -------------------------------------------------------------- |
| 문서 버전 | v1.0                                                           |
| 작성일    | 2026.04.26                                                     |
| 작성자    | Hun (taehunkim.builds@gmail.com)                               |
| 상태      | 초안 (의사결정 통합)                                           |
| 자매 문서 | donghaengpet_PRD_v1.md / gigupick_PRD_v1.md / p-tour_PRD_v1.md |
| 모티브    | 동행펫 + "3시간 워라밸" + "일상 펫 산책·미식·펫캉스"           |

## 변경 이력

| 버전   | 일자       | 작성자 | 변경 내용                                                                                                                            |
| ------ | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| v1.0   | 2026.04.26 | Hun    | 최초 작성 — 동행펫·3시간 워라밸·일상 펫 라이프스타일 짬뽕                                                                            |
| v1.0.1 | 2026.04.26 | Hun    | 13장 외부 의존성 보강 — 한국관광공사 OpenAPI 6개 서비스, 18개 endpoint 단위 매핑 추가                                                |
| v1.0.2 | 2026.04.26 | Hun    | 한국관광콘텐츠랩 전체 API 리스트 검토 후 5개 서비스 추가 — 집중률 예측·두루누비·수요지수 3종·연관관광지·웰니스·생태 결합             |
| v1.0.3 | 2026.04.26 | Hun    | 웹 우선 구현 결정에 맞춰 **Web Push / Service Worker / PWA 의존 제거**. 알림은 이메일 P0 + 카카오톡 채널 P1로 단순화                 |
| v1.0.4 | 2026.04.26 | Hun    | **ORM 변경: Drizzle → Prisma**. Server Actions는 Prisma + pg driver adapter, Edge Function은 Supabase 클라이언트/raw SQL로 분리 운용 |
| v1.0.5 | 2026.04.26 | Hun    | 11장 데이터 모델 — Prisma `schema.prisma` 초안, ERD, 인덱스 전략, RLS 정책 매트릭스 추가 (총 16개 테이블)                            |

---

## 목차

1. Executive Summary
2. 문제 정의 & 시장 배경
3. 타겟 페르소나 & JTBD
4. 성공 지표 (KPI 3축)
5. 제품 범위 (In/Out of Scope)
6. 기능 요구사항 (P0~P2)
7. 사용자 여정 & 정보구조
8. 와이어프레임 개요
9. 비기능 요구사항
10. 기술 아키텍처
11. 데이터 모델
12. API 설계
13. 외부 의존성 (TourAPI / 카카오)
14. 보안 & 개인정보
15. 비즈니스 모델
16. 운영 정책
17. 마케팅 & 출시
18. 분석 & 측정
19. 일정 & 마일스톤
20. 리스크 & 의존성 (사업성 분석 포함)
21. 부록 (의사결정 이력 / 용어집 / 참고자료)

---

## 1. Executive Summary

본 문서는 **2026 관광데이터 활용 공모전 ① 웹·앱 개발 부문** 출품을 위한 「펫타임(가칭)」 서비스의 제품 요구사항 정의서(PRD) v1입니다. 동행펫(주말 강원 펫 여행)과 차별화하여, **평일 퇴근 후 1~6시간 안에 다녀올 수 있는 한적하고 펫 친화적인 동네/근교를 즉시 추천**하는 일상 펫 라이프스타일 컴패니언을 정의합니다.

### 1.1 서비스 이름 및 한 줄 정의

#### 서비스 이름

서비스 제목: 댕로드

#### 한 줄 정의

> 퇴근 18:12, 시간 슬라이더 3시간 → 한적도 87점·펫동반 검증된 충남 근교 3곳 즉시 추천.

### 1.2 핵심 차별점 6

1. **시간 슬라이더 → 반경 자동 계산** — 출발지·시간·실시간 ETA 결합
2. **현재 + 30일 예측 한적도** — 데이터랩 빅데이터(이동통신·내비) + **관광지 집중률 30일 예측** + 수요 강도 지수 + UGC 결합. 다른 펫 서비스에 없는 "**미래 한적도**" 차별점
3. **두루누비 기반 산책로** — 한국관광공사 공식 도보·자전거 코스 데이터로 산책로 메타 신뢰성 ↑
4. **펫동반 검증 배지** — TourAPI 반려동물 + 사용자 방문·사진 검증(3명+ 방문 + 사진 + 최근 6개월)
5. **추천 이유 투명 공개** — 3줄 근거 칩(거리·한적도·펫검증) + 미래 예측 라벨
6. **충남 1지역 특화 + 수도권 직장인 캡처** — KTX·SRT 30분~1시간 반경, RTO 특별상 후보

### 1.3 1차 심사 예상 점수

| 항목                 | 배점    | 예상점수  | 근거                                                                                                                                              |
| -------------------- | ------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 서비스 기획력        | 30      | 27~29     | 명확한 직장인 페인 + 시간슬라이더·한적도 독창성                                                                                                   |
| 서비스 완성도        | 30      | 25~27     | 6개 P0 기능, 일상 사용 UX                                                                                                                         |
| 데이터 활용 적절성   | 20      | **19~20** | TourAPI 4.0 + 반려동물 동반여행 + 데이터랩 + **집중률 예측** + **두루누비** + 수요지수 3종 + 연관·중심관광지 + 웰니스·생태 = **11개 서비스 결합** |
| 서비스 발전성        | 20      | 16~18     | 다층 BM(카페·산책로 광고 + 펫 상품), 다른 RTO 확장                                                                                                |
| 가점 (지역특화 충남) | +2      | +2        | 충남 단독 launching                                                                                                                               |
| **소계**             | **102** | **88~96** | **Top 5 안정권**                                                                                                                                  |

---

## 2. 문제 정의 & 시장 배경

### 2.1 시장 배경

**2026년 3월 1일부터 "반려동물 동반출입 음식점" 제도**가 시행됩니다. 펫팸족 600만 가구 시대에, 평일 퇴근 후 외출은 그동안 "야근 끝나고 어디 갈 수 있나"라는 막연함 때문에 포기되어 왔습니다. 한국관광공사가 OpenAPI로 제공하는 반려동물 동반여행정보·데이터랩 빅데이터(이동통신·내비)를 결합하면, **"퇴근 18:12, 3시간 안에 다녀올 한적한 펫 친화 장소 3곳"**을 즉시 추천할 수 있는데, 이를 구현한 서비스는 부재합니다.

또한 충남(공주·천안·아산·서산)은 수도권에서 KTX·SRT로 30분~1시간 반경이며 펫프렌들리 카페·산책로·캠핑장이 빠르게 증가 중인 시드 지역입니다.

### 2.2 사용자 페인포인트

1. "퇴근 후 어디 가지" — **매번 5~10분 검색하다 포기**
2. 갔다가 사람·강아지 너무 많아서 못 즐기고 옴 (한적도 정보 없음)
3. 갔는데 "펫동반 가능"이라더니 실제는 테라스만 가능
4. 매번 같은 동네 산책로만 돈다 (새 코스 발굴 어려움)
5. 펫 카페·식당 정보가 인스타·블로그 흩어져 있음

### 2.3 경쟁 서비스 갭

| 카테고리       | 대표                     | 한계                              |
| -------------- | ------------------------ | --------------------------------- |
| 종합 펫앱      | 반려생활·펫츠고·멍냥보감 | 시설 디렉토리, 시간·한적도 미반영 |
| 시간 기반 추천 | 마이리얼트립·트리플      | 여행 전용, 일상 외출 ✗            |
| 동네 산책      | 멍로드·산책왕            | 산책 기록 위주, 추천·한적도 ✗     |
| 데이터랩 자체  | 한국관광 데이터랩        | 분석 콘텐츠, 사용자 추천 서비스 ✗ |

---

## 3. 타겟 페르소나 & JTBD

### 3.1 메인 페르소나: 30대 직장인 펫팸족

| 항목       | 내용                                                                           |
| ---------- | ------------------------------------------------------------------------------ |
| 이름(가명) | 이지원                                                                         |
| 연령       | 33세                                                                           |
| 거주       | 수도권(서울 마포·성동) 또는 충남(천안·아산)                                    |
| 직업       | 사무직, 야근 잦음, 평일 18:30~19:30 퇴근                                       |
| 반려견     | 비숑 6kg / 4살 / 사람 많은 곳 ✗                                                |
| 사용 패턴  | 평일 1~2회 동네 30분 산책 + 평일 1회 근교 3시간 외출 + 주말 1회 1박 펫캉스(P1) |
| 페인       | "오늘 어디 가지" 검색 5~10분 → 포기 빈번                                       |

### 3.2 JTBD

- "퇴근 18시 12분, 자정까지 6시간 안에 한적하고 펫 갈 수 있는 곳을 5초 안에 알고 싶다"
- "내 동네 매번 같은 산책로 말고, 새로운 한적한 산책로를 매주 1곳씩 발굴하고 싶다"
- "왜 거기 추천하는지 데이터로 보여주면 더 신뢰할 수 있다"

### 3.3 페르소나 액셔널

> "퇴근 후 한적한 펫 외출"

---

## 4. 성공 지표 (KPI 3축)

| 축          | 지표                       | 베타 1차 (10월) | 1년 차 ('27 4월) |
| ----------- | -------------------------- | --------------- | ---------------- |
| Acquisition | 누적 가입자                | 800             | 30,000           |
| Acquisition | 등록 펫 수                 | 800             | 22,000           |
| Acquisition | DAU                        | 150             | 4,000            |
| Engagement  | **시간슬라이더 검색 수**   | 5,000           | 200,000          |
| Engagement  | 코스/장소 클릭 수          | 3,000           | 150,000          |
| Engagement  | 검증 배지 등록(방문 체크)  | 200             | 12,000           |
| Engagement  | D14 리텐션                 | 22%             | 35%              |
| Revenue     | 입점 시설 수               | 40              | 400              |
| Revenue     | 펫 상품 광고 매출          | 검증            | 월 600만원       |
| Revenue     | 카페·산책로 입점 광고 매출 | 검증            | 월 800만원       |

> 펫타임은 동행펫·기구픽보다 **사용 빈도가 높은 일상 서비스**라 DAU·검색 수가 핵심 지표.

---

## 5. 제품 범위 (In/Out of Scope)

### 5.1 In-scope (P0 — 8월 베타)

- **F1** 시간 슬라이더(1~6시간, 디폴트 3시간, 30분 단위) → 반경 자동 계산
- **F2** 한적도 점수 (한국관광 데이터랩 + UGC 보강, 0~100점)
- **F3** 펫동반 검증 배지 (TourAPI + UGC: 3명+ 방문 + 사진 1장+ + 최근 6개월)
- **F4** 추천 이유 3줄 근거 칩 (거리·한적도·펫검증)
- **F5** 펫 입장 가능 동네 카페·식당
- **F6** 펫 산책로 (TourAPI 위치기반 + 자체 등록)

### 5.2 Out-of-scope (P1 — 9~10월)

- **F7** 사용자 위치 기반 장소 추천 강화 (5분~1시간 동네 산책로 매일 새 코스)
- **F8** 도장깨기 (봄 한적 카페 5곳, 가을 새 산책로 7곳 등 시즌 누적)
- **F9** 주말 펫캉스 1박 매칭
- **F10** 입점 운영자 어드민 (자가등록 → 운영자 사전검토 → 승인)

### 5.3 Future (P2 — '27)

- **F11** 다른 RTO 지역 확장 (강원·경북·제주)
- **F12** 다국어 (한국관광공사 다국어 OpenAPI)
- **F13** 펫보험·펫브랜드 제휴

---

## 6. 기능 요구사항

### 6.1 F1. 시간 슬라이더 (P0)

- 입력: 출발지(GPS or 우편번호 입력) + 시간(1~6h, 디폴트 3h, 30분 단위) + 출발 시간(현재 또는 미래 설정)
- 처리: 카카오모빌리티 ETA로 반경 동적 계산, Vercel KV 24h TTL 캐싱
- 출력: 반경 내 후보 POI 풀 → 한적도·펫검증 필터 → 상위 3곳 카드
- **AC**: 입력 변경 후 결과 5초 이내, 주중·주말·시간대별 ETA 차이 반영

### 6.2 F2. 한적도 점수 (P0) — "현재 + 30일 예측" 2축

- **현재 한적도(0~100)**: 한국관광 데이터랩 `locgoVisitorList`(시간대별 통행량) + `locgoNaviSrch`(실시간 검색량) → 정규화
- **30일 예측 한적도**: 한국관광 **관광지 집중률 방문자 추이 예측 정보**로 향후 30일 일별 예측 점수 표시
- **수요 강도 보정**: 수요 강도 지수가 높은 시·군은 한적도 페널티
- **카테고리 가산점**: 웰니스·생태 관광지는 한적도 +5
- **UGC 보강**: 사용자 "한적함/적당/혼잡" 3단계 평가 결합
- 표시: "**오늘 18시 87점 · 내일 같은 시간 92점 · 이번 주 평균 89점**"
- **AC**: 점수 산출 1초 이내, 데이터 부족 시 "표본 부족" 라벨, 예측 신뢰구간 표기

### 6.3 F3. 펫동반 검증 배지 (P0)

- TourAPI 반려동물 동반여행정보 = 1차 메타데이터
- UGC 검증 = 다른 사용자 3명 이상 방문 체크 + 최근 6개월 내 + 사진 1장 이상
- 조건 충족 시 "검증 배지" 부여, 미충족 시 "검증 진행 중"
- **AC**: 사용자 방문 체크 시 즉시 카운트, 사진 자동 EXIF 검증

### 6.4 F4. 추천 이유 3줄 근거 칩 (P0)

- 카드 하단 항상 표시
- 형식: `42km(48분) · 한적도 87점 · 검증 배지(사용자 5명)`
- 각 칩 클릭 시 상세 데이터 모달
- **AC**: 모든 추천에 3줄 근거 노출, 데이터 부재 시 "표본 부족" 표기

### 6.5 F5. 펫 입장 가능 동네 카페·식당 (P0)

- TourAPI 음식점 + 반려동물 동반여행정보 결합
- 카테고리: 카페, 식당, 디저트, 베이커리
- 펫 정책 표시 (체구 무관/소형견만/테라스만/실내OK)
- **AC**: 충남 4시 베타 단계 80개+ 정합성 확보

### 6.6 F6. 펫 산책로 (P0) — 두루누비 1차 + 위치기반 보조

- **1차 데이터: 한국관광공사 두루누비 정보 서비스** (공식 도보·자전거 코스 — 거리·소요시간·고저차·구간 좌표 표준화)
- **2차 데이터**: TourAPI 위치기반(공원·하천)
- **3차 데이터**: 자체 등록(UGC) + 펫동반 검증 결합
- 산책로 메타: 거리(km), 고저차, 평탄도, 펫 가능, 화장실, 식수, 그늘 정도, 코스 구간 좌표
- 충남 권역 두루누비 길(예: 백제문화길·금강길) 우선 시드
- **AC**: 충남 4시 + 수도권 일부 두루누비 코스 100개+ + UGC 등록 100개+ 시드

---

## 7. 사용자 여정 & 정보구조

### 7.1 Happy Path

① 카카오/네이버 로그인 → ② 펫 프로필 등록 → ③ (선택) 이메일 알림 시간 설정(디폴트 18시) → ④ 18:12 퇴근, 직접 접속 또는 이메일 링크 클릭 → ⑤ 시간 슬라이더 3시간 → ⑥ 한적도 87점 양수리 두물머리 표시 → ⑦ 카카오 길찾기 → ⑧ 다녀와서 "한적함" 평가 + 사진 등록 → ⑨ 검증 배지 카운트 +1

### 7.2 정보구조 (4단)

```
[홈]
   ├─ 시간 슬라이더(메인 카피)
   ├─ 추천 3곳 카드(거리·한적도·펫검증 칩)
   └─ "오늘 새 산책로" (P1)

[장소 상세]
   ├─ 사진·소개·펫 정책
   ├─ 한적도 시간대별 차트
   ├─ 검증 배지 진행도(N/3)
   ├─ 카카오 길찾기
   └─ 후기·사진

[마이펫타임]
   ├─ 펫 프로필 / 다녀온 곳 / 후기
   ├─ 도장깨기 진행도(P1)
   └─ 이메일 알림 설정(시간·요일·OFF)

[운영자(P1)]
   └─ 시설 등록·관리
```

---

## 8. 와이어프레임 개요

반응형 웹, 모바일 우선. shadcn/ui + Tailwind, 데이터 중심.

### 8.1 핵심 화면 4종

- **W1 홈**: 시간 슬라이더 + 추천 3곳 카드(거리·한적도·펫검증 3줄 칩)
- **W2 장소 상세**: 사진·소개 + 한적도 시간대 차트 + 검증 배지 진행도
- **W3 펫 프로필**: 견종·체중·이동제한·민감 정보 동의
- **W4 알림 설정**: 이메일 자동 알림 ON/OFF·시간 변경·요일 선택

---

## 9. 비기능 요구사항

| 카테고리 | 요구사항               | 목표값                      |
| -------- | ---------------------- | --------------------------- |
| 성능     | LCP / FID / CLS        | ≤ 2.5s / ≤ 100ms / ≤ 0.1    |
| 성능     | 시간슬라이더 추천 응답 | ≤ 5s                        |
| 성능     | 한적도 점수 응답       | ≤ 1s                        |
| 접근성   | WCAG                   | AA                          |
| 보안     | TLS / RLS / Rate Limit | HTTPS / 전 테이블 / Upstash |
| 보안     | 봇 방지                | Cloudflare Turnstile        |
| 가용성   | 월 가용률              | 99.9%                       |
| 알림     | 이메일 발송 성공률     | ≥ 98%                       |
| 알림     | 이메일 오픈율          | ≥ 25%                       |

---

## 10. 기술 아키텍처

### 10.1 스택 (동행펫과 동일 적용 + 펫타임 특수)

| 레이어        | 선택                                                       | 비고                                                                 |
| ------------- | ---------------------------------------------------------- | -------------------------------------------------------------------- |
| 프론트엔드    | Next.js (App Router) + TypeScript                          | 동행펫 동일                                                          |
| UI            | shadcn/ui + Tailwind, 데이터 중심                          | 동행펫 디자인 시스템 공유                                            |
| 지도          | react-kakao-maps-sdk                                       | 공유                                                                 |
| 상태관리      | TanStack Query + Zustand                                   | 공유                                                                 |
| 폼            | react-hook-form + zod                                      | 공유                                                                 |
| BFF           | Next.js Server Actions                                     | 공유                                                                 |
| DB            | Supabase Postgres + **Prisma ORM**(pg driver adapter)      | Server Actions에서 사용. Edge Function은 Supabase 클라이언트/raw SQL |
| Auth          | Auth.js + Supabase Auth                                    | **카카오 + 네이버** OAuth                                            |
| Edge Compute  | Supabase Edge Functions                                    | 시간슬라이더 추천 알고리즘                                           |
| 검색          | Postgres FTS + PGroonga                                    | 한국어                                                               |
| **시간 캐싱** | Vercel KV / Upstash Redis                                  | **카카오모빌리티 ETA 24h TTL**                                       |
| Cron          | Supabase pg_cron                                           | TourAPI + 데이터랩 일별 동기화                                       |
| Rate Limit    | Upstash Rate Limit                                         | Edge                                                                 |
| 봇 방지       | Cloudflare Turnstile                                       | 가입·체크·후기                                                       |
| **알림**      | **이메일(Resend 또는 AWS SES) + 카카오톡 채널 메시지(P1)** | 사용자 설정 시간 자동 발송 (디폴트 18:00)                            |
| 관측성        | GA4 + Vercel Analytics + Sentry                            | 동일                                                                 |
| CI/CD         | Vercel + GitHub Actions                                    | 동일                                                                 |

### 10.2 시스템 다이어그램

```
[Browser (반응형 웹)] ↔ [Vercel / Server Actions] ↔ [Supabase Postgres + Prisma]
                            ↓
                  [Edge Function: time-slider-recommender]
                            ↓
        [TourAPI 5종 / 데이터랩 빅데이터 / 카카오 Local·Map·Mobility]
                            ↑
              [Vercel KV: ETA 24h cache]

[Cron: 사용자 설정 시간(디폴트 18:00 KST)에 이메일 발송]
[Resend/SES: 트랜잭션 이메일 + 일일 추천 이메일]
```

> **ORM 운용 노트**: Server Actions는 Prisma(`pg` driver adapter)로 호출. Edge Functions에서는 콜드스타트·번들 크기 문제로 Prisma 직접 호출 ✗ → **Supabase 클라이언트 또는 raw SQL** 사용. 두 경로 모두 동일 Postgres + 동일 RLS.

---

## 11. 데이터 모델

핵심 16개 테이블. RLS 활성화. **Prisma ORM**으로 스키마 관리(`schema.prisma` 단일 파일).

### 11.1 테이블 한눈에 (16개)

| #   | 테이블                              | 역할                                             | RLS                  |
| --- | ----------------------------------- | ------------------------------------------------ | -------------------- |
| 1   | `users`                             | 카카오/네이버 OAuth 계정, 이메일 알림 설정       | 본인                 |
| 2   | `pets`                              | 반려견 일반 정보(견종·체중·연령·이동제한)        | 본인                 |
| 3   | `pets_sensitive`                    | **펫 헬스(알레르기·만성질환) — 분리·명시 동의**  | 본인만               |
| 4   | `pois`                              | TourAPI 미러링 (카페·식당·산책로·관광지·캠핑 등) | 공개 read            |
| 5   | `durunubi_courses`                  | 두루누비 도보·자전거 코스 (산책로 1차)           | 공개 read            |
| 6   | `quietness_scores`                  | 데이터랩 시간대별 한적도(현재)                   | 공개 read            |
| 7   | `poi_forecasts`                     | 관광지 집중률 30일 예측(미래)                    | 공개 read            |
| 8   | `demand_indices`                    | 수요 강도·자원 수요·다양성 지수                  | 공개 read            |
| 9   | `verifications`                     | 사용자 방문 체크 + EXIF 사진 검증                | 본인 write·공개 read |
| 10  | `badges`                            | POI 단위 검증 배지 (펫 검증·웰니스·생태)         | 공개 read            |
| 11  | `recommendations`                   | 시간슬라이더 추천 결과·이유 칩                   | 본인                 |
| 12  | `reviews`                           | 후기·별점·사진                                   | 공개 read·본인 write |
| 13  | `vendor_replies`                    | 사장님 공식 답변                                 | 운영자/본인          |
| 14  | `vendors` (P1)                      | 입점 시설(사업자번호·정산계좌)                   | 본인+운영자          |
| 15  | `analytics_events`                  | KPI 이벤트 적재                                  | 서비스               |
| 16  | `email_logs` / `tour_api_sync_logs` | 이메일·ETL 운영 로그                             | 운영자               |

### 11.2 ERD 개요 (텍스트)

```
User ─┬─< Pet ──── PetSensitive (1:1, 분리)
      ├─< Verification >─── Poi ─┬─< QuietnessScore
      ├─< Recommendation         ├─< PoiForecast
      ├─< Review >── Poi         ├─< Badge
      ├─── Vendor >─── VendorReply ──── Review
      └─< EmailLog                ├─── DurunubiCourse (1:1)
                                  └─< Reviews

Poi ──(sigunguCode)─→ DemandIndex (시·군 단위 집계)

AnalyticsEvent: User 옵셔널, 익명 이벤트도 적재
TourApiSyncLog: 일별 ETL 실행 기록
```

### 11.3 Prisma 스키마 초안 (`prisma/schema.prisma`)

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"] // pg driver adapter
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // Prisma Migrate 용
}

// ===== Enums =====

enum PoiType {
  CAFE
  RESTAURANT
  TRAIL
  PARK
  ATTRACTION
  ACCOMMODATION
  REST_AREA
}

enum SyncSource {
  TOUR_API_KOR
  TOUR_API_PET
  DATALAB_VISITOR
  DATALAB_NAVI
  DATALAB_FORECAST
  DATALAB_DEMAND
  DURUNUBI
  WELLNESS
  ECO
  GO_CAMPING
  USER_UGC
}

enum QuietnessSource {
  DATABANK_VISITOR
  DATABANK_NAVI
  FORECAST_30D
  UGC
}

enum VisitEvaluation {
  QUIET
  OK
  CROWDED
}

enum BadgeType {
  PET_VERIFIED
  WELLNESS
  ECO
  TRAIL_OFFICIAL
}

enum RecommendStatus {
  PENDING
  COMPLETED
  FAILED
}

enum ReviewStatus {
  PUBLIC
  HIDDEN_REPORTED
  REMOVED
}

enum VendorTier {
  FREE
  FEATURED
  PREMIUM
}

enum VendorApproval {
  PENDING
  APPROVED
  REJECTED
}

// ===== Core =====

model User {
  id                  String   @id @default(uuid()) @db.Uuid
  kakaoId             String?  @unique @map("kakao_id")
  naverId             String?  @unique @map("naver_id")
  email               String?  @unique
  nickname            String?
  baseAddress         String?  @map("base_address")
  baseGeohash7        String?  @map("base_geohash7")
  locale              String   @default("ko")
  emailNotifyEnabled  Boolean  @default(false) @map("email_notify_enabled")
  emailNotifyTime     String   @default("18:00") @map("email_notify_time")
  emailNotifyDays     String[] @default(["MON","TUE","WED","THU","FRI"]) @map("email_notify_days")
  role                String   @default("user") // user | vendor | admin
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  pets            Pet[]
  verifications   Verification[]
  recommendations Recommendation[]
  reviews         Review[]
  vendor          Vendor?
  emailLogs       EmailLog[]

  @@index([baseGeohash7])
  @@map("users")
}

model Pet {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  name         String
  breed        String
  weightKg     Decimal  @map("weight_kg") @db.Decimal(4, 2)
  ageYears     Int      @map("age_years")
  restrictions String[] // ['CAR_SICK','HEAT_SENSITIVE','NOISE_SENSITIVE']
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  sensitive PetSensitive?

  @@index([userId])
  @@map("pets")
}

model PetSensitive {
  id          String   @id @default(uuid()) @db.Uuid
  petId       String   @unique @map("pet_id") @db.Uuid
  allergies   String[]
  conditions  String[]
  consentedAt DateTime @map("consented_at")
  consentVer  String   @map("consent_ver")

  pet Pet @relation(fields: [petId], references: [id], onDelete: Cascade)

  @@map("pets_sensitive")
}

// ===== POI =====

model Poi {
  id            String     @id @default(uuid()) @db.Uuid
  source        SyncSource
  sourceId      String     @map("source_id")
  contentTypeId Int?       @map("content_type_id")
  name          String
  type          PoiType
  category1     String?    @map("category_1")
  category2     String?    @map("category_2")
  category3     String?    @map("category_3")
  sigunguCode   Int?       @map("sigungu_code") // 충남: 33020·33040·33050·33150
  ldongCode     String?    @map("ldong_code")
  address       String?
  lat           Float
  lng           Float
  geohash7      String

  imageUrls     String[]   @map("image_urls")
  intro         String?
  homepage      String?
  phone         String?

  // 펫 메타 (detailPetTour)
  petAllowed    Boolean    @default(false) @map("pet_allowed")
  petSizeMaxKg  Int?       @map("pet_size_max_kg")
  petIndoor     Boolean?   @map("pet_indoor")
  petOutdoor    Boolean?   @map("pet_outdoor")
  petPolicyText String?    @map("pet_policy_text")

  // 카테고리 가산점
  isWellness    Boolean    @default(false) @map("is_wellness")
  isEco         Boolean    @default(false) @map("is_eco")

  lastSyncedAt  DateTime   @map("last_synced_at")
  createdAt     DateTime   @default(now()) @map("created_at")
  updatedAt     DateTime   @updatedAt @map("updated_at")

  quietnessScores QuietnessScore[]
  forecasts       PoiForecast[]
  verifications   Verification[]
  badges          Badge[]
  reviews         Review[]
  durunubi        DurunubiCourse?
  vendors         Vendor[]

  @@unique([source, sourceId])
  @@index([sigunguCode, type])
  @@index([geohash7])
  @@index([petAllowed])
  @@index([type, lat, lng])
  @@map("pois")
}

model DurunubiCourse {
  id              String   @id @default(uuid()) @db.Uuid
  poiId           String?  @unique @map("poi_id") @db.Uuid
  routeIdx        String   @unique @map("route_idx")
  routeName       String   @map("route_name")
  themeName       String?  @map("theme_name")
  totalDistanceKm Decimal  @map("total_distance_km") @db.Decimal(6, 2)
  totalElevationM Int?     @map("total_elevation_m")
  estimatedMin    Int?     @map("estimated_min")
  difficultyLevel Int?     @map("difficulty_level")
  pathGeoJson     Json?    @map("path_geojson")
  imageUrls       String[] @map("image_urls")
  description     String?
  lastSyncedAt    DateTime @map("last_synced_at")

  poi Poi? @relation(fields: [poiId], references: [id], onDelete: SetNull)

  @@map("durunubi_courses")
}

// ===== 한적도 / 예측 / 수요지수 =====

model QuietnessScore {
  id          String          @id @default(uuid()) @db.Uuid
  poiId       String?         @map("poi_id") @db.Uuid
  sigunguCode Int             @map("sigungu_code")
  weekday     Int             // 0(일)~6(토)
  hourSlot    Int             @map("hour_slot") // 0~23
  score       Int             // 0~100
  source      QuietnessSource
  sampleSize  Int?            @map("sample_size")
  computedAt  DateTime        @map("computed_at")

  poi Poi? @relation(fields: [poiId], references: [id], onDelete: Cascade)

  @@unique([sigunguCode, weekday, hourSlot, source, poiId])
  @@index([poiId])
  @@map("quietness_scores")
}

model PoiForecast {
  id               String   @id @default(uuid()) @db.Uuid
  poiId            String   @map("poi_id") @db.Uuid
  forecastDate     DateTime @map("forecast_date") @db.Date
  expectedScore    Int      @map("expected_score") // 0~100
  expectedVisitors Int?     @map("expected_visitors")
  confidence       Decimal? @db.Decimal(3, 2)
  computedAt       DateTime @map("computed_at")

  poi Poi @relation(fields: [poiId], references: [id], onDelete: Cascade)

  @@unique([poiId, forecastDate])
  @@index([forecastDate])
  @@map("poi_forecasts")
}

model DemandIndex {
  id              String   @id @default(uuid()) @db.Uuid
  sigunguCode     Int      @map("sigungu_code")
  periodMonth     String   @map("period_month") // YYYY-MM
  resourceDemand  Decimal? @map("resource_demand") @db.Decimal(6, 2)
  demandIntensity Decimal? @map("demand_intensity") @db.Decimal(6, 2)
  diversity       Decimal? @db.Decimal(6, 2)
  computedAt      DateTime @map("computed_at")

  @@unique([sigunguCode, periodMonth])
  @@map("demand_indices")
}

// ===== UGC =====

model Verification {
  id         String          @id @default(uuid()) @db.Uuid
  poiId      String          @map("poi_id") @db.Uuid
  userId     String          @map("user_id") @db.Uuid
  visitedAt  DateTime        @map("visited_at")
  photoUrl   String?         @map("photo_url")
  evaluation VisitEvaluation
  exifLat    Float?          @map("exif_lat")
  exifLng    Float?          @map("exif_lng")
  exifAt     DateTime?       @map("exif_at")
  isValid    Boolean         @default(true) @map("is_valid")
  createdAt  DateTime        @default(now()) @map("created_at")

  poi  Poi  @relation(fields: [poiId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([poiId, userId, visitedAt])
  @@index([poiId])
  @@index([userId])
  @@map("verifications")
}

model Badge {
  id        String    @id @default(uuid()) @db.Uuid
  poiId     String    @map("poi_id") @db.Uuid
  badgeType BadgeType @map("badge_type")
  grantedAt DateTime  @map("granted_at")
  expiresAt DateTime? @map("expires_at") // 6개월 신선도
  metadata  Json?

  poi Poi @relation(fields: [poiId], references: [id], onDelete: Cascade)

  @@unique([poiId, badgeType])
  @@map("badges")
}

// ===== 추천 =====

model Recommendation {
  id                String          @id @default(uuid()) @db.Uuid
  userId            String          @map("user_id") @db.Uuid
  petId             String?         @map("pet_id") @db.Uuid
  status            RecommendStatus @default(PENDING)
  departureLat      Float           @map("departure_lat")
  departureLng      Float           @map("departure_lng")
  departureGeohash7 String          @map("departure_geohash7")
  timeHours         Int             @map("time_hours")
  startAt           DateTime        @map("start_at")
  resultsJson       Json?           @map("results_json")
  reasonChips       Json?           @map("reason_chips")
  requestAt         DateTime        @default(now()) @map("request_at")
  completedAt       DateTime?       @map("completed_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, requestAt])
  @@map("recommendations")
}

// ===== 후기 =====

model Review {
  id          String       @id @default(uuid()) @db.Uuid
  userId      String       @map("user_id") @db.Uuid
  poiId       String       @map("poi_id") @db.Uuid
  rating      Int          // 1~5
  body        String?
  photos      String[]
  status      ReviewStatus @default(PUBLIC)
  reportCount Int          @default(0) @map("report_count")
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")

  user  User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  poi   Poi          @relation(fields: [poiId], references: [id], onDelete: Cascade)
  reply VendorReply?

  @@index([poiId])
  @@index([userId])
  @@map("reviews")
}

model VendorReply {
  id        String   @id @default(uuid()) @db.Uuid
  reviewId  String   @unique @map("review_id") @db.Uuid
  vendorId  String   @map("vendor_id") @db.Uuid
  body      String
  createdAt DateTime @default(now()) @map("created_at")

  review Review @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  vendor Vendor @relation(fields: [vendorId], references: [id], onDelete: Cascade)

  @@map("vendor_replies")
}

// ===== Vendor (P1) =====

model Vendor {
  id             String         @id @default(uuid()) @db.Uuid
  ownerUserId    String         @unique @map("owner_user_id") @db.Uuid
  bizNumber      String         @unique @map("biz_number")
  bizAccount     String?        @map("biz_account")
  name           String
  type           PoiType
  poiId          String?        @map("poi_id") @db.Uuid
  approvalStatus VendorApproval @default(PENDING) @map("approval_status")
  premiumTier    VendorTier     @default(FREE) @map("premium_tier")
  petPolicy      Json?          @map("pet_policy")
  imageUrls      String[]       @map("image_urls")
  description    String?
  hours          Json?
  contact        String?
  createdAt      DateTime       @default(now()) @map("created_at")
  updatedAt      DateTime       @updatedAt @map("updated_at")

  user    User          @relation(fields: [ownerUserId], references: [id], onDelete: Cascade)
  poi     Poi?          @relation(fields: [poiId], references: [id])
  replies VendorReply[]

  @@index([approvalStatus])
  @@map("vendors")
}

// ===== 운영 / 분석 =====

model AnalyticsEvent {
  id        BigInt   @id @default(autoincrement())
  userId    String?  @map("user_id") @db.Uuid
  sessionId String?  @map("session_id")
  event     String
  props     Json?
  ts        DateTime @default(now())

  @@index([event, ts])
  @@index([userId, ts])
  @@map("analytics_events")
}

model EmailLog {
  id         String    @id @default(uuid()) @db.Uuid
  userId     String    @map("user_id") @db.Uuid
  type       String    // 'daily_recommend','verify_email','unsubscribe_confirm'
  subject    String?
  status     String    // 'queued','sent','delivered','bounced','opened','clicked'
  sentAt     DateTime? @map("sent_at")
  openedAt   DateTime? @map("opened_at")
  clickedAt  DateTime? @map("clicked_at")
  externalId String?   @map("external_id")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, sentAt])
  @@map("email_logs")
}

model TourApiSyncLog {
  id           BigInt    @id @default(autoincrement())
  dataset      String
  startedAt    DateTime  @map("started_at")
  finishedAt   DateTime? @map("finished_at")
  countAdded   Int       @default(0) @map("count_added")
  countUpdated Int       @default(0) @map("count_updated")
  countRemoved Int       @default(0) @map("count_removed")
  status       String
  errorMessage String?   @map("error_message")

  @@index([dataset, startedAt])
  @@map("tour_api_sync_logs")
}
```

### 11.4 인덱스·성능 핵심

| 시나리오                   | 인덱스                                                                   |
| -------------------------- | ------------------------------------------------------------------------ |
| 출발지 반경 검색 (F1)      | `pois(geohash7)` + `pois(type, lat, lng)`                                |
| 충남 시·군 + 카테고리 필터 | `pois(sigunguCode, type)`                                                |
| 펫동반 가능만 1차 컷       | `pois(petAllowed)`                                                       |
| 시간슬라이더 ETA 키        | Vercel KV (DB 인덱스 ✗)                                                  |
| 한적도 시간대별 조회       | `quietness_scores(sigunguCode, weekday, hourSlot, source, poiId)` 유니크 |
| 30일 예측 일별 조회        | `poi_forecasts(forecastDate)` + `(poiId, forecastDate)` 유니크           |
| 사용자 추천 이력           | `recommendations(userId, requestAt)`                                     |
| 후기 POI별 정렬            | `reviews(poiId)`                                                         |
| 이벤트 분석                | `analytics_events(event, ts)`, `(userId, ts)`                            |

### 11.5 RLS 정책 매트릭스 (Supabase)

| 테이블                                                  | SELECT                      | INSERT       | UPDATE        | DELETE        |
| ------------------------------------------------------- | --------------------------- | ------------ | ------------- | ------------- |
| `users`                                                 | 본인 + 서비스               | 서비스       | 본인          | 본인          |
| `pets`                                                  | 본인                        | 본인         | 본인          | 본인          |
| `pets_sensitive`                                        | **본인만** (단독)           | **본인만**   | **본인만**    | **본인만**    |
| `pois` / `durunubi_courses`                             | 공개                        | 서비스(ETL)  | 서비스        | 서비스        |
| `quietness_scores` / `poi_forecasts` / `demand_indices` | 공개                        | 서비스(ETL)  | 서비스        | 서비스        |
| `verifications`                                         | 공개 read · 본인 detail     | 본인         | 본인          | 본인          |
| `badges`                                                | 공개                        | 서비스(자동) | 서비스        | 서비스        |
| `recommendations`                                       | 본인                        | 본인         | 본인          | 본인          |
| `reviews`                                               | 공개                        | 본인         | 본인          | 본인 + 운영자 |
| `vendor_replies`                                        | 공개                        | 본인(vendor) | 본인          | 본인 + 운영자 |
| `vendors`                                               | 공개(승인됨만) + 본인(전체) | 본인         | 본인 + 운영자 | 운영자        |
| `analytics_events`                                      | 운영자                      | 서비스       | ✗             | 운영자        |
| `email_logs`                                            | 본인 + 운영자               | 서비스       | 서비스        | 운영자        |
| `tour_api_sync_logs`                                    | 운영자                      | 서비스       | 서비스        | 운영자        |

### 11.6 마이그레이션·시드 운용 노트

- **로컬**: `npx prisma migrate dev` — 스키마 변경 시 SQL 자동 생성
- **운영**: `npx prisma migrate deploy` — Vercel 배포 시 GitHub Actions에서 실행
- **시드 데이터**: `prisma/seed.ts` — 충남 4시 areaCode/sigunguCode 매핑 + 카테고리코드(분류체계) + 두루누비 코스 메타
- **MV(Materialized View)**: 한적도는 `quietness_scores`에서 7일 rolling 평균을 별도 MV로 새벽 3시 갱신(`pg_cron`)
- **Edge 호출 분리**: 코스 알고리즘 Edge Function에서는 Prisma 대신 Supabase 클라이언트(`@supabase/supabase-js`) 또는 raw SQL로 호출 (콜드스타트·번들 크기 회피)

---

## 12. API 설계

### 12.1 Server Actions

| Action                   | 입력                        | 출력                     | 비고                            |
| ------------------------ | --------------------------- | ------------------------ | ------------------------------- |
| `auth.signIn`            | provider                    | session                  | 카카오/네이버                   |
| `pets.createPet`         | PetInput                    | Pet                      | zod                             |
| `recommendations.search` | RecommendInput              | Recommendation           | Edge Function                   |
| `verifications.checkIn`  | poi_id, photo, evaluation   | ok                       | EXIF 검증, Turnstile            |
| `pois.detail`            | poi_id, hour                | POIDetail with quietness | 시간대별 점수                   |
| `reviews.create`         | ReviewInput                 | Review                   | 필터                            |
| `notifySettings.update`  | email_time, days[], enabled | ok                       | 이메일 자동 발송 시간·요일 설정 |

### 12.2 Edge Function: `time-slider-recommender`

입력:

```ts
type Input = {
  user_id: string;
  pet_id: string;
  departure: { lat: number; lng: number } | { address: string };
  time_h: number; // 1~6
  start_at?: string; // ISO, default now()
};
```

내부 로직:

```
1. resolve departure to coords (kakaoLocal if address)
2. estimate radius_km = (time_h / 2) * avg_speed (initial heuristic)
3. fetch POI candidates within radius (pois + pet_meta filter)
4. for each candidate, fetch ETA from kakaoMobility (KV 24h cache)
5. filter ETA <= time_h/2 (round trip)
6. calc score: 0.4 * quietness + 0.3 * verification + 0.2 * dist_inverse + 0.1 * weather_indoor
7. return top 3 with reason chips (km, quietness_score, verifications_count)
```

---

## 13. 외부 의존성 — 한국관광공사 OpenAPI 활용 명세 (endpoint 단위)

> 한국관광콘텐츠랩(api.visitkorea.or.kr)은 공공데이터포털(data.go.kr) 인증키로 호출. JSON/XML 두 형식 지원. 이하 펫타임 P0~P1에 활용할 endpoint를 기능별로 매핑한다.

### 13.1 한국관광공사 OpenAPI 활용 매핑 (총 6개 서비스, 18개 endpoint)

#### 13.1.1 ① TourAPI 4.0 — 국문 관광정보 서비스 (서비스ID: `KorService2`)

| Endpoint             | 데이터                                                                    | 펫타임 활용                                                     | 적용 기능   |
| -------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------- |
| `areaBasedList2`     | 지역기반 관광정보 (관광지·문화시설·축제·여행코스·레포츠·숙박·쇼핑·음식점) | 충남 4시(공주·천안·아산·서산) POI 풀 시드 ETL                   | F1·F5·F6    |
| `locationBasedList2` | 좌표 기반 반경 검색 (mapX, mapY, radius)                                  | 시간슬라이더로 계산된 반경 내 POI 후보 추출                     | **F1 핵심** |
| `searchKeyword2`     | 키워드 검색                                                               | 사용자가 카페·산책로 키워드 직접 검색                           | F5·F6       |
| `searchFestival2`    | 행사정보 (eventStartDate~eventEndDate)                                    | 추천 결과에 진행 중 행사 자동 부착                              | F4 보조     |
| `searchStay2`        | 숙박정보                                                                  | 주말 펫캉스(P1)                                                 | F9(P1)      |
| `detailCommon2`      | POI 공통정보(이름·주소·설명·전화)                                         | POI 상세 페이지 카드                                            | F4·F5·F6    |
| `detailIntro2`       | POI 소개정보(콘텐츠 타입별 상세 — 카페/식당 영업시간 등)                  | 펫 정책·영업시간 표시                                           | F5          |
| `detailInfo2`        | POI 반복정보 (코스 구간 등)                                               | 산책로 구간별 정보                                              | F6          |
| `detailImage2`       | POI 이미지 정보                                                           | 카드 시각화 (썸네일·갤러리)                                     | 전체        |
| `areaCode2`          | 지역코드 (시·도, 시·군·구)                                                | 충남(33) → 공주(33020)·천안(33040)·아산(33050)·서산(33150) 매핑 | 시드        |
| `ldongCode2`         | 법정동코드                                                                | 동네 단위 산책로 매핑 (P1 위치기반 강화)                        | F7(P1)      |
| `categoryCode2`      | 분류체계 코드 (대·중·소 분류)                                             | "카페·식당·산책로·공원" 카테고리 표준화                         | F5·F6       |
| `areaBasedSyncList2` | 동기화 목록 (수정/추가/삭제)                                              | 일별 ETL 증분 동기화                                            | 운영        |

#### 13.1.2 ② 반려동물 동반여행 서비스 (서비스ID: `KorPetTourService`)

| Endpoint                 | 데이터                                                          | 펫타임 활용                                            | 적용 기능      |
| ------------------------ | --------------------------------------------------------------- | ------------------------------------------------------ | -------------- |
| `areaBasedList` (펫)     | 반려동물 동반 가능 관광지·문화시설·축제·숙박·음식점·레포츠·쇼핑 | 충남 펫동반 가능 시설 풀 시드 (F3 1차 메타)            | **F3·F5 핵심** |
| `locationBasedList` (펫) | 좌표+반경 펫동반 가능 시설 검색                                 | F1 반경 내 펫동반 가능 POI 1차 필터                    | **F1·F3 핵심** |
| `searchKeyword` (펫)     | 펫동반 키워드 검색                                              | 사용자 펫 카페·식당 키워드 검색                        | F5             |
| `detailPetTour`          | 반려동물 동반 상세(가능 조건·체구 제한·부대시설)                | 펫 정책 상세(체구·실내/테라스·리드줄·동반 마릿수) 표시 | **F3·F5 핵심** |

#### 13.1.3 ③ 한국관광 데이터랩 — 관광빅데이터 정보서비스 (서비스ID: `TourCntStatsService`)

> 한적도 점수 산출의 핵심 데이터. 이동통신(KT)·신용카드·내비게이션 빅데이터를 시·군·구 단위로 제공.

| Endpoint                          | 데이터                                      | 펫타임 활용                                        | 적용 기능        |
| --------------------------------- | ------------------------------------------- | -------------------------------------------------- | ---------------- |
| `metcoVisitorList`                | 광역지자체별 방문자수                       | 충남 전체 시즌별 추세                              | F2 보조          |
| `locgoVisitorList`                | **기초지자체별 방문자수 (시간대별·요일별)** | **시·군 단위 시간대 통행량 → 한적도 0~100 정규화** | **F2 핵심**      |
| `metcoRegnVisitrDDList`           | 광역×광역 일자별 방문자수                   | 수도권 → 충남 유입 추세(시즌성)                    | F2 보조          |
| `locgoRegnVisitrDDList`           | 기초지자체별 일자별 방문자수                | 동일 시군 일자별 추이                              | F2               |
| `hubTravelerList`                 | 광역지자체별 (관광)거점 방문자              | 검증·보조 지표                                     | F2 보조          |
| `metcoCardSpendng`                | 광역 카드 소비                              | 향후 BM 검증 (P1+)                                 | 분석             |
| `locgoCardSpendng`                | 기초 카드 소비                              | 동일                                               | 분석             |
| `metcoNaviSrch` / `locgoNaviSrch` | 내비게이션 검색량                           | **실시간 한적도 보강(검색 급증 = 사람 몰림 신호)** | **F2 핵심 보강** |

#### 13.1.4 ④ **관광지 집중률 방문자 추이 예측 정보** (`TatsCnctrRtService`) — F2 한적도 "미래 차원" ★★★ 신규 핵심

> 한국관광 데이터랩의 **조회일 기준 향후 30일 관광객 집중률·방문자 추이 예측** 데이터. 펫타임의 메인 카피 "한적한 펫 외출"과 결정적 시너지. 다른 펫 서비스에 없는 "**미래 한적도 예측**" 차별점이 여기서 나온다.

| Endpoint(개념)               | 데이터                             | 펫타임 활용                               |
| ---------------------------- | ---------------------------------- | ----------------------------------------- |
| 광역지자체별 집중률 예측     | 시·도 단위 30일 집중률             | 충남 시즌 추세                            |
| **기초지자체별 집중률 예측** | 시·군 단위 30일 집중률·방문자 추이 | **F2 미래 예측 (오늘 vs 내일 vs 다음주)** |
| 관광지별 집중률 예측         | POI 단위 30일 예측                 | 추천 카드에 "내일 한적 예상 92점" 라벨    |

#### 13.1.5 ⑤ **두루누비 정보 서비스** (`DurunubiService`) — F6 산책로 1차 데이터 ★★★ 신규 핵심

> 한국관광공사가 운영하는 **걷기·자전거 코스 통합 플랫폼**. 펫 산책로의 1차 공식 데이터로 가장 정합성 높은 소스. `locationBasedList2`(일반 위치)보다 **코스 기반 구조화 데이터**라 산책로 메타(거리·평탄도·구간)에 적합.

| Endpoint(개념)     | 데이터                                           | 펫타임 활용                   |
| ------------------ | ------------------------------------------------ | ----------------------------- |
| 길 정보 조회       | 주제별 도보·자전거 길(예: 해파랑길·코리아둘레길) | 충남 권역 도보길 시드         |
| **코스 정보 조회** | 코스별 거리·소요시간·고저차·구간 좌표            | **F6 산책로 메타데이터 표준** |
| 코스 상세/이미지   | 구간 사진·설명                                   | 산책로 카드 시각화            |

#### 13.1.6 ⑥ **지역별 관광 수요 지수 3종** (자원수요/수요강도/다양성) — F2·F4 한적도 보강 ★★ 신규

> 빅데이터 기반 관광 산업 활성화 지수. 단순 "방문자수" 외에 **수요의 질·강도·다양성**까지 측정. 펫타임 한적도 점수 산출 알고리즘에 가중치로 결합.

| 서비스                    | 지표                            | 펫타임 활용                              |
| ------------------------- | ------------------------------- | ---------------------------------------- |
| **지역별 관광 자원 수요** | 관광 서비스 수요·문화 자원 수요 | 한적도 보정 가중치                       |
| **지역별 관광 수요 강도** | 관광 체류 강도·소비 강도        | "강도 높음" = 사람 몰림 → 한적도 ↓ 보정  |
| **지역별 관광 다양성**    | 관광객·소비·국제적 다양성       | 외지인 vs 현지인 비율로 한적 시간대 도출 |

#### 13.1.7 ⑦ **관광지별 연관 관광지 + 기초지자체 중심 관광지** — F4·F7 추천 강화 ★★ 신규

> 빅데이터로 분석한 "이 관광지 다녀온 사람이 자주 가는 다른 관광지" 정보. F1 추천 결과에 cross-sell·다양성을 더하고, F7(P1 위치기반 추천 강화)의 알고리즘 핵심 자산.

| 서비스                     | 데이터                                                 | 펫타임 활용                                         |
| -------------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| **관광지별 연관 관광지**   | 중심 관광지 ↔ 연관 관광지 50위 (전체/관광지/음식/숙박) | "이 펫 카페 다녀온 사람이 많이 가는 산책로" 추천    |
| **기초지자체 중심 관광지** | 시·군 단위 중심 관광지 100위                           | 충남 4시 시드 풀 우선순위, 검증 시드 후보 우선 등록 |

#### 13.1.8 ⑧ 웰니스 + 생태 관광 정보 — 메인 가치 강화 ★ 신규

> "퇴근 후 한적한 외출" 메인 카피와 자연 시너지. 일반 관광지가 아닌 **힐링·웰니스·친환경** 카테고리의 별도 큐레이션 데이터.

| 서비스             | 펫타임 활용                                    |
| ------------------ | ---------------------------------------------- |
| **웰니스관광정보** | 자연치유·산림욕 등 한적·힐링형 POI 가산점      |
| **생태 관광 정보** | 친환경 관광지 = 보통 한적·자연 → "한적도" 보정 |

#### 13.1.9 ⑨ 고캠핑 정보조회 서비스 (`GoCamping`) — P1 펫캉스용

| Endpoint                                    | 펫타임 활용                              |
| ------------------------------------------- | ---------------------------------------- |
| `basedList` / `locationList` / `searchList` | 충남 펫동반 가능 캠핑장 (주말 펫캉스 P1) |
| `imageList`                                 | 캠핑장 사진                              |

#### 13.1.10 ⑩ 다국어 관광정보 (영/일/중·노/서/불/독·번체) — P2

| 활용                                                                                                  |
| ----------------------------------------------------------------------------------------------------- |
| 외국인 사용자 콘텐츠 보강(P2). 충남 베타 단계는 한국어만. 향후 글로벌 펫팸 확장 시 8개 언어 자산 활용 |

#### 13.1.11 ⑪ 포토코리아 관광사진 + 관광공모전 사진 수상작 — 선택 보강

| 활용                                                                                       |
| ------------------------------------------------------------------------------------------ |
| 일반 TourAPI 이미지 부족 POI를 **관광공모전 수상작 + 포토코리아**로 대체. 카드 시각 품질 ↑ |

#### 13.1.12 ⑫ 무장애 여행 / 의료관광 / 오디오 가이드 / 채용정보 — 펫타임 직접 활용 ✗

| 서비스                                  | 사유                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------- |
| 무장애 여행 정보                        | 페르소나 다름. 단 P2에서 "가족(아이+펫) 동반 외출" 확장 시 가산점 후보 |
| 의료관광정보 / 오디오 가이드 / 채용정보 | 펫타임 도메인 직접 활용 ✗                                              |

### 13.2 펫타임 P0 기능 ↔ Endpoint 직접 매핑 표 (보강)

| 기능                       | 1차 호출                                                             | 2차 호출                                                                                          | 3차 보강                                              | 캐시                   |
| -------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------- |
| **F1 시간슬라이더 → 추천** | TourAPI4 `locationBasedList2` + 펫 `locationBasedList`               | 카카오모빌리티 ETA                                                                                | **연관관광지** (cross-sell), **중심관광지**(우선순위) | 24h KV                 |
| **F2 한적도 점수**         | 데이터랩 `locgoVisitorList`(현재 시점)                               | **집중률 예측(향후 30일)** + `locgoNaviSrch`(실시간 검색량) + **수요 강도/자원 수요/다양성** 지수 | 웰니스/생태 카테고리 보정 + UGC 3단계 평가            | 일별 ETL → Postgres MV |
| **F3 펫동반 검증 배지**    | 펫 `areaBasedList` + `detailPetTour`                                 | UGC 방문 체크 + EXIF 사진                                                                         | -                                                     | Postgres 영속          |
| **F4 추천 이유 3줄 칩**    | 거리=ETA / 한적도=현재 + **30일 예측** / 검증=`detailPetTour`+UGC    | -                                                                                                 | -                                                     | 추천 결과 포함         |
| **F5 동네 카페·식당**      | 펫 `areaBasedList`(음식점) + TourAPI4 `detailIntro2`                 | TourAPI4 `detailImage2` + **연관관광지(음식 50위)**                                               | 포토코리아·공모전 사진 보강                           | 일별 ETL               |
| **F6 산책로**              | **두루누비 길/코스 정보** ★ 1차 + TourAPI4 `locationBasedList2` 보조 | TourAPI4 `detailInfo2`(구간) + UGC                                                                | 웰니스·생태로 한적도 가산점                           | 일별 ETL               |

### 13.3 충남 4개 시 시드 코드 (areaCode 33)

| 시·군 | sigunguCode |
| ----- | ----------- |
| 공주  | 33020       |
| 천안  | 33040       |
| 아산  | 33050       |
| 서산  | 33150       |

S3 스프린트(6/9~6/22) ETL 1차 시 위 4개 코드로 `areaBasedList2` + 펫 `areaBasedList`를 호출해 POI 풀 구축.

### 13.4 카카오 OpenAPI

| API                                          | 용도                                |
| -------------------------------------------- | ----------------------------------- |
| 카카오 + 네이버 OAuth                        | 인증                                |
| 카카오 로컬 (키워드/카테고리/주소-좌표 변환) | 출발지 주소 → 좌표, 응급 동물병원   |
| 카카오맵 JS SDK                              | 결과 시각화                         |
| **카카오모빌리티 길찾기**                    | **F1 시간슬라이더 ETA 계산 (핵심)** |
| 카카오톡 공유 SDK                            | 추천 공유                           |

### 13.5 비용·한도 통제

- **TourAPI 4.0 / 펫 / 데이터랩**: pg_cron으로 **일별 일괄 ETL** → Postgres 미러링. 사용자 요청 시 자체 DB만 조회 (실시간 호출 0)
- **카카오모빌리티 ETA**: 출발지·목적지 쌍 단위로 Vercel KV에 24h TTL 캐싱 (key: `mob:eta:from_geohash7|to_poi_id`)
- **카카오 로컬**: 응급 검색 결과 6h 캐싱
- **데이터랩**: 시간대별 통행량은 일별 ETL + 7일 rolling window로 Postgres MV 갱신
- **Upstash Rate Limit**: 사용자별 분당 30회, IP 분당 60회
- 일일 비용 임계치 80% 도달 시 Sentry 알림

---

## 14. 보안 & 개인정보

- 카카오 + 네이버 OAuth
- JWT 1h / refresh 30d
- RLS 전 테이블, 펫 헬스는 `pets_sensitive` 분리
- 봇 방지: Turnstile + Upstash
- 위치 정보: 출발지 좌표는 추천 1회 사용 후 즉시 암호화 저장(주기적 삭제)
- 이메일 알림: 사용자 명시 동의 + 시간/요일 자율 설정 + 1탭 수신거부(unsubscribe 링크)

### 14.1 OWASP

- SQLi: Prisma 파라미터화 쿼리 (raw SQL 사용 시 `$queryRaw` 안전 모드)
- XSS: React + DOMPurify
- CSRF: Server Actions origin
- IDOR: RLS

### 14.2 약관

- 이용약관 + 개인정보처리방침 + 펫 헬스 동의 + 위치 정보 동의 + 이메일 마케팅 알림 동의

---

## 15. 비즈니스 모델

### 15.1 다층 BM

| 채널                         | 구조                                           | 비고                                            |
| ---------------------------- | ---------------------------------------------- | ----------------------------------------------- |
| **카페·산책로 입점 광고**    | 무료 입점 + 유료 등급제(Free/Featured/Premium) | 동행펫 패턴 재사용                              |
| **펫 상품 광고**             | 사료·간식·용품·펫보험 노출 광고                | 추천 카드 사이드 노출, 검증 배지 카드 옆 띠광고 |
| **B2G 협력 (P2)**            | 충남관광공사·시군 협력                         | 추천 시설 일정 기간 Featured 무상               |
| **펫 상품 제휴 커미션 (P2)** | 펫보험·펫푸드 제휴 가입 시 커미션              | LTV 강화                                        |

### 15.2 단계별 검증

- 베타(8~10월): 무료 입점 시드 40개 확보, 광고 검증
- 출시 1단계(11~12월): Featured 출시 + 펫 상품 광고 1차 도입
- 출시 2단계('27 1Q): 펫보험·펫푸드 제휴 + 다른 RTO 지역 확장

---

## 16. 운영 정책

### 16.1 입점 시설 관리(P1)

- 자가등록 → 운영자 사전검토 → 승인 (동행펫 동일)
- 등록 폼: 사업자번호 + 시설사진 + 펫정책(체구·실내·테라스·리드줄) + 영업시간 + 연락처

### 16.2 검증 배지 운영

- 자동 카운트(방문 체크 + EXIF 사진)
- 운영자 신고 → 운영자 검토 → 배지 회수 가능
- 6개월 그레이스 기간 후 데이터 신선도 자동 확인

### 16.3 후기 모더레이션

- 동행펫 동일: 자동 필터 + 신고 + 사장님 답변

### 16.4 이메일 알림 (P0) + 카카오톡 채널 (P1)

- **이메일(P0)**: 사용자 동의 후만 발송. 디폴트 18:00 KST, 사용자 설정으로 시간·요일·OFF 전환 가능
- 발송 인프라: Resend 또는 AWS SES + Supabase pg_cron 트리거
- 콘텐츠: "오늘 18시 퇴근하시나요? 충남 한적도 87점 코스가 새로 도착했어요" + 추천 카드 미리보기 + CTA 링크
- 1탭 수신거부(unsubscribe), 빈도 제한(주중 최대 5회)
- **카카오톡 채널 메시지(P1)**: 채널 추가한 사용자 대상 주간 다이제스트
- 푸시 알림(브라우저 Web Push)은 P2 이후 검토 (현 단계 ✗)

### 16.5 CS

- 이메일 + 카카오톡 채널 1:1

---

## 17. 마케팅 & 출시

### 17.1 베타 모집 (8월, 다채널)

- **충남 직장인 커뮤니티** — 천안·아산·공주 산업단지 사내 커뮤니티
- **수도권 펫팸 인플루언서** — 인스타·유튜브 펫 데일리 크리에이터
- **충남관광공사 협업** — 공식 채널 노출
- **펫 카페 매장 제휴** — 충남 펫 카페 QR 프로모션

### 17.2 베타 1차 KPI

- 가입 800, 펫 등록 800, DAU 150
- 시간슬라이더 검색 5,000, 검증 배지 등록 200, 입점 40개

### 17.3 출시 일정

- 베타: 8월 1일~9월 30일
- 1차 심사: 10월 중
- 정식 출시(GA): 11월 시상식 후

---

## 18. 분석 & 측정

### 18.1 도구

- GA4 + Vercel Analytics + Sentry (3개 자매 서비스 동일)
- 자체 `analytics_events` (시간슬라이더·검증 funnel)

### 18.2 측정 이벤트 (16종)

```
sign_up, login, email_subscribed, email_opened, email_clicked,
pet_created, pet_sensitive_consent,
slider_changed, recommend_requested, recommend_viewed,
poi_viewed, kakao_directions_clicked,
visit_check_in, photo_uploaded,
review_submitted, review_reported,
badge_earned
```

---

## 19. 일정 & 마일스톤

2주 단위 11개 스프린트. 동행펫·기구픽·P-Tour와 인프라·디자인 시스템 공유로 절약.

| 스프린트 | 기간       | 핵심 산출물                                                                                               |
| -------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| S1       | 5/12~5/25  | 환경 셋업, 카카오/네이버 OAuth, 기본 레이아웃                                                             |
| S2       | 5/26~6/8   | 펫 프로필 폼, 이메일 알림 구독·설정, Resend/SES 셋업                                                      |
| S3       | 6/9~6/22   | Prisma 스키마(12개 테이블) + TourAPI ETL(반려동물·지역기반·위치기반·이미지·분류체계, 충남) + 데이터랩 ETL |
| S4       | 6/23~7/6   | F1 시간슬라이더 1차 + 카카오모빌리티 ETA 캐싱                                                             |
| S5       | 7/7~7/20   | F2 한적도 점수 + F4 3줄 근거 칩, 알고리즘 1차                                                             |
| S6       | 7/21~8/3   | F3 검증 배지 + F5 동네 카페 + F6 산책로                                                                   |
| S7       | 8/4~8/17   | 베타 오픈, 충남 직장인·인플루언서 시드, 18시 이메일 자동 발송 가동                                        |
| S8       | 8/18~8/31  | 베타 데이터 보강, 한적도 정합성 튜닝, 검증 배지 카운트 검증                                               |
| S9       | 9/1~9/14   | F7 위치 기반 추천 강화, 후기/모더레이션, F10 입점 어드민 1차                                              |
| S10      | 9/15~9/28  | 안정화, 성능(LCP), 접근성, Sentry 알림                                                                    |
| S11      | 9/29~10/12 | 1차 심사 자료, 시연 영상, PT — 심사 대응                                                                  |

---

## 20. 리스크 & 의존성 (사업성 분석 포함)

### 20.1 사업성 진단 — 종합 7.5/10

**긍정 (강점)**

- 펫팸족 600만 + 2026.3.1 반려동물 동반 음식점 제도 시행 시너지
- 일상 사용 = 주말 여행 서비스 대비 LTV·리텐션 압도적
- 데이터랩 빅데이터 활용 사례 적음 → 데이터 차별 점수 ★★★★
- 충남(공주·천안·아산·서산) 수도권 직장인 1시간 반경 + RTO 특별상

**부정 (리스크) — 솔직하게**

- 한적도 점수 정합성: 데이터랩 빅데이터는 통행량 proxy, 펫 동반 한적도와 직접 매핑 안 됨 (UGC 보강 필수)
- 평일 야근으로 외출 빈도 낮을 수 있음 → 주말 사용 케이스 P1로 보완
- "매일 새 산책로" 공급량 한계 (한 동네 산책로 10~30개) → 시간대 + 코스 변형으로 분산
- 이메일 의존 리텐션은 도달율·오픈율 한계가 있음 → 카카오톡 채널(P1)·웹 자체 알림센터로 보강

### 20.2 리스크 매트릭스

| 카테고리    | 리스크                           | 대응                                                                  |
| ----------- | -------------------------------- | --------------------------------------------------------------------- |
| 데이터      | 한적도 점수 정합성 부족          | UGC 평가(3단계) + 표본 부족 라벨링 + 운영자 보강                      |
| 데이터      | TourAPI 펫 정보 + 실제 정책 차이 | 검증 배지 시스템으로 보강(3명+ 사진+)                                 |
| 시장        | 평일 외출 빈도 낮음              | 30분 동네 산책 케이스 P0 + 주말 펫캉스 P1                             |
| 시장        | 충남 입점 풀 부족                | 충남관광공사 협력 우선 시드 + 매장 QR                                 |
| 사용자 경험 | 이메일 도달율·오픈율 한계        | 카카오톡 채널(P1) + 웹 자체 알림센터 + 우수 콘텐츠로 자발 재방문 유도 |
| 외부 API    | 카카오모빌리티 비용 폭주         | 24h KV 캐싱 + 임계치 알림                                             |
| 외부 API    | TourAPI/데이터랩 변경            | ETL fallback, Sentry                                                  |
| 일정        | S5(한적도) 지연                  | 단순 통행량 proxy로 베타, 정밀화 S8                                   |
| 법무        | 위치 정보 처리                   | 추천 1회 사용 후 즉시 암호화·삭제, 동의 분리                          |
| 법무        | 펫 헬스 정보                     | `pets_sensitive` RLS 분리 + 명시 동의                                 |
| 보안        | 봇·어뷰징 검증 배지 조작         | EXIF 검증 + Rate Limit + 신고                                         |

---

## 21. 부록

### 21.1 의사결정 이력

| 항목                      | 결정                                                                                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 공모 부문                 | ① 웹·앱 개발                                                                                                                                                                  |
| 아이디어                  | 펫타임 — 퇴근 후 한적한 펫 외출                                                                                                                                               |
| 모티브                    | 동행펫 + 3시간 워라밸 + 일상 펫 라이프스타일 짬뽕                                                                                                                             |
| 메인 카피                 | "퇴근 후 한적한 펫 외출" — 단일 정체성                                                                                                                                        |
| 지역                      | 충남 단독(공주·천안·아산·서산)                                                                                                                                                |
| 페르소나                  | 30대 직장인 펫팸족(1인가구·신혼)                                                                                                                                              |
| 한적도                    | 한국관광 데이터랩 빅데이터 + **30일 집중률 예측** + 수요 강도 지수 + 웰니스·생태 가산점 + UGC 보강 (3단계 평가)                                                               |
| 산책로 1차 데이터         | **두루누비** 공식 코스 정보                                                                                                                                                   |
| 활용 한국관광공사 OpenAPI | **11개 서비스** (TourAPI 4.0 / 반려동물 동반여행 / 데이터랩 / **집중률 예측** / **두루누비** / 수요지수 3종 / 연관관광지·중심관광지 / 웰니스·생태 / 고캠핑·다국어·포토 - P1+) |
| 시간슬라이더              | 1~6시간, 디폴트 3시간, 30분 단위                                                                                                                                              |
| 출발지 입력               | GPS / 우편번호 / 주소 + 카카오모빌리티 실시간 ETA                                                                                                                             |
| P0 기능                   | F1~F6 (시간슬라이더/한적도/검증배지/이유공개/동네카페/산책로)                                                                                                                 |
| 검증 배지                 | 다른 사용자 3명+ 방문 + 사진 1장+ + 최근 6개월                                                                                                                                |
| F4 UI                     | 3줄 근거 칩(거리·한적도·검증)                                                                                                                                                 |
| 알림                      | **이메일 P0** (Resend/SES, 디폴트 18:00 KST, 사용자 시간/요일/OFF 자율) + 카카오톡 채널 P1                                                                                    |
| BM                        | 카페·산책로 입점 광고 + 펫 상품 광고 다층                                                                                                                                     |
| 인증                      | 카카오 + 네이버 OAuth                                                                                                                                                         |
| 기술 스택                 | Next.js + Supabase Postgres + **Prisma ORM** + shadcn/ui + react-kakao-maps-sdk + GA4/Sentry. Edge Function은 Supabase 클라이언트/raw SQL                                     |
| 데이터 동기화             | 일별 일괄 + 이벤트 증분                                                                                                                                                       |
| 모더레이션                | 자동 필터 + 신고 + 사장님 답변                                                                                                                                                |
| 봇 방지                   | Cloudflare Turnstile + Upstash Rate Limit                                                                                                                                     |
| 비기능                    | LCP 2.5s + WCAG AA + 기본 보안                                                                                                                                                |
| 일정                      | 2주 스프린트 11회                                                                                                                                                             |
| KPI                       | 3축 균형 + DAU·검색수 강조                                                                                                                                                    |
| P1                        | F7 위치 기반 강화 → F8 도장깨기 → F9 펫캉스 → F10 입점 어드민                                                                                                                 |
| P2                        | F11 다른 RTO / F12 다국어 / F13 펫보험·펫푸드 제휴                                                                                                                            |

### 21.2 용어집

- **시간슬라이더**: 사용자가 외출 가능 시간을 1~6시간 선택하는 슬라이더 UI
- **한적도 점수**: 0~100, 시간대별 통행량 proxy + UGC 평가 결합
- **검증 배지**: TourAPI + UGC 3단 검증 통과 시 부여
- **데이터랩**: 한국관광 데이터랩(datalab.visitkorea.or.kr)
- **EXIF**: 사진 메타데이터(촬영시각·위치)
- **Prisma ORM**: TypeScript용 ORM(`schema.prisma` 단일 스키마 파일 + `prisma migrate`로 마이그레이션 관리)
- **Resend / AWS SES**: 트랜잭션·마케팅 이메일 발송 인프라

### 21.3 참고자료

- 공고문 PDF (선택 폴더)
- [한국관광 콘텐츠랩](https://api.visitkorea.or.kr/)
- [한국관광 데이터랩](https://datalab.visitkorea.or.kr/)
- [카카오 디벨로퍼스](https://developers.kakao.com/)
- [카카오모빌리티](https://developers.kakaomobility.com/)
- [Prisma ORM](https://www.prisma.io/docs)
- [Resend (이메일 SDK)](https://resend.com/docs)
- [AWS SES](https://docs.aws.amazon.com/ses/)

---

> **Next**: PRD v1 검토 → v1.1에서 시간슬라이더 와이어프레임·한적도 알고리즘 정밀화·충남 베타 시드 명단·제안서 5p PDF 변환 진행 예정.
