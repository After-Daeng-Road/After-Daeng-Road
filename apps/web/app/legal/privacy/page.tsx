// PRD §14.2 개인정보처리방침 — stub (정식 본문은 법무·DPO 검토 후 교체)

export const metadata = { title: '개인정보처리방침' };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold">개인정보처리방침</h1>
      <p className="mb-6 text-xs text-gray-500">최종 개정 2026-04-29 · v1.0</p>

      <article className="prose prose-sm max-w-none space-y-4 text-sm text-gray-700">
        <section>
          <h2 className="font-semibold">1. 수집 항목 및 목적</h2>
          <ul className="list-disc pl-5">
            <li>카카오/네이버 OAuth ID, 이메일 — 인증·로그인</li>
            <li>닉네임, 기본 출발지(시·군 수준) — 추천 개인화</li>
            <li>반려견 정보(이름·견종·체중·연령) — 펫 동반 적합도 판정</li>
            <li>
              펫 헬스 정보(알레르기·만성질환) — <strong>별도 동의 시에만</strong>
            </li>
            <li>출발지 좌표 — 추천 알고리즘에 1회 사용 후 24h 내 평문 무효화</li>
          </ul>
        </section>
        <section>
          <h2 className="font-semibold">2. 보관 기간</h2>
          <ul className="list-disc pl-5">
            <li>회원 탈퇴 시 즉시 삭제 (분쟁 대비 30일 보관 후 완전 파기)</li>
            <li>출발지 좌표: 평문 24h, 암호화 90일</li>
            <li>이메일 발송 로그: 1년</li>
            <li>감사 로그(보안): 1년</li>
          </ul>
        </section>
        <section>
          <h2 className="font-semibold">3. 외부 제공·위탁</h2>
          <ul className="list-disc pl-5">
            <li>Supabase (DB·인증) — 한국/싱가포르 region</li>
            <li>Vercel (서비스 호스팅) — 글로벌 CDN</li>
            <li>Resend (이메일 발송) — 미국</li>
            <li>Cloudflare (Turnstile 봇 방지) — 글로벌</li>
            <li>Sentry (오류 모니터링) — PII 자동 스크러빙 적용</li>
          </ul>
        </section>
        <section>
          <h2 className="font-semibold">4. 사용자 권리</h2>
          <p>열람·정정·삭제·처리 정지 요청 권리가 있으며 해지·수신거부는 1탭으로 가능합니다.</p>
        </section>
        <section>
          <h2 className="font-semibold">5. 보안 조치</h2>
          <ul className="list-disc pl-5">
            <li>전송: TLS 1.3</li>
            <li>저장: Postgres RLS + 펫 헬스/좌표 별도 암호화</li>
            <li>접근 제어: JWT 1h / 카카오·네이버 OAuth 2.0</li>
            <li>봇·어뷰징 방어: Cloudflare Turnstile + Upstash Rate Limit</li>
          </ul>
        </section>
        <section>
          <h2 className="font-semibold">6. 문의처</h2>
          <p>이메일: privacy@daengroad.app (베타 기간 운영자 직접 응대)</p>
        </section>
        <section className="text-xs text-gray-500">
          ※ 본 페이지는 베타 단계 stub 입니다. 정식 본문은 법무·DPO 검토 후 교체됩니다.
        </section>
      </article>
    </main>
  );
}
