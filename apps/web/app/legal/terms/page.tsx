// PRD §14.2 약관 — stub (정식 본문은 법무 검토 후 교체)

export const metadata = { title: '이용약관' };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold">이용약관</h1>
      <p className="mb-6 text-xs text-gray-500">최종 개정 2026-04-29 · v1.0</p>

      <article className="prose prose-sm max-w-none space-y-4 text-sm text-gray-700">
        <section>
          <h2 className="font-semibold">제1조 (목적)</h2>
          <p>
            본 약관은 댕로드(이하 "서비스")가 제공하는 펫 외출 추천 및 관련 서비스의 이용 조건을
            규정합니다.
          </p>
        </section>
        <section>
          <h2 className="font-semibold">제2조 (회원가입 및 인증)</h2>
          <p>
            카카오/네이버 OAuth 를 통해 가입하며, 가입 시 본 약관과 개인정보처리방침에 동의한 것으로
            간주됩니다.
          </p>
        </section>
        <section>
          <h2 className="font-semibold">제3조 (펫 헬스 정보 분리 동의)</h2>
          <p>
            반려견의 알레르기·만성질환 등 헬스 정보는 별도 동의 절차를 거쳐 분리된 테이블에
            보관되며, 본인만 접근할 수 있습니다.
          </p>
        </section>
        <section>
          <h2 className="font-semibold">제4조 (위치 정보)</h2>
          <p>
            출발지 좌표는 추천 1회 사용 후 24시간 내 평문이 무효화되며, 암호화된 형태로 90일까지
            보관 후 영구 삭제됩니다.
          </p>
        </section>
        <section className="text-xs text-gray-500">
          ※ 본 페이지는 베타 단계 stub 입니다. 정식 본문은 법무 검토 후 교체됩니다.
        </section>
      </article>
    </main>
  );
}
