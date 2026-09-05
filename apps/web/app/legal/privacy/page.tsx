import { COPY } from '@/lib/copy';

// PRD §14.2 개인정보처리방침 v1.1 — 현행 기능 전수 반영 (2026-09-05). 정식 본문은 법무·DPO 검토 후 확정.

export const metadata = { title: COPY.common.privacy };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-ink">{COPY.common.privacy}</h1>
      <p className="mb-6 text-xs text-muted">최종 개정 2026-09-05 · v1.1</p>

      <article className="prose prose-sm max-w-none space-y-4 text-sm text-body">
        <section>
          <h2 className="font-semibold text-ink">1. 수집 항목 및 목적</h2>
          <ul className="list-disc pl-5">
            <li>카카오·구글·네이버 OAuth ID, 이메일, 닉네임 — 인증·로그인·계정 식별</li>
            <li>반려견 정보(이름·견종·체중·연령) — 펫 동반 적합도 판정·추천 개인화</li>
            <li>
              펫 헬스 정보(알레르기·만성질환) — <strong>별도 동의 시에만</strong> 분리 보관
            </li>
            <li>
              출발지 좌표 — <strong>위치 동의 시</strong> 추천 계산에 사용, 24h 내 평문 무효화
            </li>
            <li>추천 이력(검색 조건·결과) — 최근 추천 다시 보기 제공</li>
            <li>후기(텍스트·별점·사진), 북마크 — 커뮤니티·개인화 기능 제공</li>
            <li>
              방문 인증 사진 및 EXIF 메타데이터(촬영 위치·시각) — 인증 유효성 검증(어뷰징 방지)
            </li>
            <li>이메일 알림 설정(수신 여부·시간·요일) — 동의한 회원에게 추천 메일 발송</li>
            <li>동의 이력(동의 종류·버전·시각·IP 주소·브라우저 정보) — 동의 사실 증빙</li>
            <li>서비스 이용 기록·접속 IP — 보안, 요청 제한(Rate Limit), 오류 분석, 이용 통계</li>
          </ul>
        </section>
        <section>
          <h2 className="font-semibold text-ink">2. 쿠키 및 유사 기술</h2>
          <ul className="list-disc pl-5">
            <li>로그인 세션 쿠키(HttpOnly, 1시간) — 인증 상태 유지</li>
            <li>브라우저 저장소 — 테마·인트로 표시 여부·최근 추천 결과 (기기에만 저장)</li>
            <li>Google Analytics·Vercel Analytics 쿠키 — 방문 통계 (식별 불가 형태)</li>
          </ul>
        </section>
        <section>
          <h2 className="font-semibold text-ink">3. 보관 기간</h2>
          <ul className="list-disc pl-5">
            <li>회원 탈퇴 시 즉시 삭제 (분쟁 대비 30일 보관 후 완전 파기)</li>
            <li>출발지 좌표: 평문 24시간, 암호화본 90일 후 영구 삭제</li>
            <li>동의 이력: 관계 법령에 따른 기간 (동의 증빙 목적)</li>
            <li>이메일 발송 로그·감사 로그(보안): 1년</li>
            <li>방문 인증·검증 배지 산정 데이터: 최근 6개월분만 배지 산정에 사용</li>
          </ul>
        </section>
        <section>
          <h2 className="font-semibold text-ink">4. 외부 제공·위탁</h2>
          <ul className="list-disc pl-5">
            <li>Supabase (DB·스토리지·서버 함수) — 데이터 보관</li>
            <li>Vercel (호스팅·방문 통계) — 글로벌 CDN</li>
            <li>Upstash (요청 제한·캐시) — IP·요청 수 처리</li>
            <li>Resend (이메일 발송) — 미국</li>
            <li>카카오 (지도·길찾기·이동시간 조회) — 출발지·목적지 좌표가 API 호출에 사용됩니다</li>
            <li>Cloudflare (Turnstile 봇 방지) — 글로벌</li>
            <li>Sentry (오류 모니터링) — PII 자동 스크러빙 적용</li>
            <li>Google Analytics (이용 통계) — 식별 불가 형태</li>
          </ul>
          <p className="mt-1 text-xs text-muted">
            장소·관광 정보 조회(한국관광공사 TourAPI·두루누비)에는 개인정보가 전달되지 않습니다.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-ink">5. 사용자 권리</h2>
          <ul className="list-disc pl-5">
            <li>개인정보 열람·정정·삭제·처리 정지 요청 (문의처 이메일)</li>
            <li>후기·북마크·펫 정보는 서비스 내에서 직접 수정·삭제 가능</li>
            <li>이메일 수신거부: 메일 하단 1탭 수신거부 또는 알림 설정에서 해제</li>
            <li>선택 동의(위치·이메일·펫 헬스)는 언제든 철회 가능하며, 철회 이력이 보관됩니다</li>
          </ul>
        </section>
        <section>
          <h2 className="font-semibold text-ink">6. 보안 조치</h2>
          <ul className="list-disc pl-5">
            <li>전송: TLS 1.3</li>
            <li>저장: Postgres RLS(행 수준 접근 제어) + 펫 헬스·좌표 별도 암호화</li>
            <li>접근 제어: JWT 1시간 / OAuth 2.0, 세션 쿠키 HttpOnly·Secure</li>
            <li>입력 검증·XSS 방지(DOMPurify), 봇·어뷰징 방어(Turnstile·Rate Limit)</li>
            <li>사진 업로드: 본인 폴더에만 업로드 가능 (스토리지 접근 정책)</li>
          </ul>
        </section>
        <section>
          <h2 className="font-semibold text-ink">7. 문의처</h2>
          <p>이메일: taehunkim.builds@gmail.com (베타 기간 운영자 직접 응대)</p>
        </section>
        <section className="text-xs text-muted">
          ※ 본 페이지는 베타 단계 문서입니다. 정식 본문은 법무·DPO 검토 후 확정됩니다.
        </section>
      </article>
    </main>
  );
}
