# [frontend] 이메일 구독 밴드 '개발 준비 중' 잠금

- **날짜**: 2026-09-05
- **브랜치**: `feature/email-cta-coming-soon` (← `dev`)
- **담당**: 프론트엔드
- **상태**: dev 병합 대기

## 주요 변경

- 홈 하단 이메일 구독 밴드(EmailCta)를 발송 기능(RESEND 키·함수 배포) 준비 전까지 잠금:
  블러 2px + 스크림 오버레이, 정중앙 '개발 준비 중이에요' 배지(발바닥 아이콘 + muted 텍스트)
- 인터랙션 완전 차단 — pointer-events + input/버튼 disabled(키보드 포함) + 스크린리더 숨김
- 오픈 시 `COMING_SOON = false` 한 줄로 복구

## 검증

- tsc·eslint 클린, 홈 200 + 배지 렌더 확인
