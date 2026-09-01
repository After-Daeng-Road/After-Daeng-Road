# [frontend] 동의 UI + 데모 카드·이미지 폴백 정리

- **날짜**: 2026-09-01
- **브랜치**: `feature/consent-ui` (← `dev`)
- **담당**: 프론트엔드
- **상태**: 구현·검증 완료, dev 병합 대기

## 개요

백엔드 QA 브랜치가 남긴 프론트 후속 4건 처리:
① 온보딩 필수 동의 게이트 ② 선택 동의(이메일·위치) 배선 ③ 데모 카드 정리 + 이미지 폴백
④ 백엔드 작성 UI(북마크·저장목록·길찾기) 디자인 검수.

## 커밋 (4)

| 커밋 | 내용 |
|---|---|
| 온보딩 필수 동의 게이트 | `consent-gate.tsx` — 로그인 유저 TERMS·PRIVACY 미동의 시 전면 모달 → `recordConsent`. 전체동의 + 필수 2종(약관 새탭) + 선택(MARKETING_EMAIL). 거부 경로는 로그아웃. layout 마운트(useSession 클라 조회로 정적 페이지 유지) |
| 선택 동의 배선 | 설정 폼: 수신 여부 "바뀐" 저장에만 `recordConsent(MARKETING_EMAIL)` (append-only 노이즈 방지). 추천 폼 '현 위치': 로그인 유저 LOCATION 동의 이력 확인 → 없으면 1회 동의 레이어 → 기록 후 geolocation |
| 이미지 폴백 + 예시 라벨 | `poi-image-fallback.tsx` 타입별 아이콘+그라디언트. 추천 카드 적용 + 데모 카드(sample-*) '예시 코스' 라벨 |
| 저장 페이지 폴백 통일 | `/me/saved` 썸네일 폴백을 타입별 폴백으로 교체 |

## ④ 디자인 검수 결과 (백엔드 작성 UI)

- `bookmark-button.tsx` — 낙관적 업데이트·롤백·로그인 리다이렉트·토큰 사용 모두 양호. 수정 없음
- `kakao-directions-button.tsx` — 토큰 준수(rounded-field·bg-brand·다크 텍스트). 수정 없음
- `/me/saved` — 토큰·다크모드 양호. 썸네일 폴백만 타입별 공용 폴백으로 통일

## 검증

- `apps/web` tsc 클린, 변경 파일 eslint 클린 (단계별 각각 확인)
- 동의 게이트: 필수 미체크 시 제출 불가, 선택은 체크 시에만 기록되는 분기 코드 확인

## 남은 것 / 후속

- 홈 초기 데모 카드의 실추천 대체 여부(콜드스타트·쿼터 고려) — 팀 논의 후 결정
- 마이페이지/설정에서 동의 상태 표시·철회 UI (선택 과제)
- 이메일 기능 배포 시(`daily-recommend-email`) 온보딩 MARKETING_EMAIL 동의와 알림 설정 기본값 연동 검토
