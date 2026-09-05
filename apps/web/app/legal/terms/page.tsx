import { COPY } from '@/lib/copy';

// PRD §14.2 약관 v1.1 — 현행 기능 전수 반영 (2026-09-05). 정식 본문은 법무 검토 후 확정.

export const metadata = { title: COPY.common.terms };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-ink">{COPY.common.terms}</h1>
      <p className="mb-6 text-xs text-muted">최종 개정 2026-09-05 · v1.1</p>

      <article className="prose prose-sm max-w-none space-y-4 text-sm text-body">
        <section>
          <h2 className="font-semibold text-ink">제1조 (목적)</h2>
          <p>
            본 약관은 댕로드(이하 {'"서비스"'})가 제공하는 반려견 동반 외출 추천 및 관련 서비스의
            이용 조건과 회원·서비스 간 권리·의무를 규정합니다.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-ink">제2조 (서비스 내용)</h2>
          <ul className="list-disc pl-5">
            <li>가용 시간·출발지 기반 반려견 동반 장소 추천 (한적도·거리·검증 정보 포함)</li>
            <li>장소 상세 정보(운영시간·펫 정책·한적도 추이)·방문 후기·사진 열람 및 작성</li>
            <li>방문 인증(체크인) 및 인증 기반 검증 배지</li>
            <li>장소 북마크, 추천 이력 조회, 반려견 프로필 관리</li>
            <li>추천 이메일 알림 (수신 동의 회원, 시간·요일 자율 설정, 1탭 수신거부)</li>
          </ul>
          <p className="mt-1 text-xs text-muted">
            장소·관광 정보는 한국관광공사 TourAPI·두루누비 등 공공 데이터를 활용하며, 실제
            운영시간·펫 동반 가능 여부는 현장 사정과 다를 수 있습니다.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-ink">제3조 (회원가입 및 인증)</h2>
          <p>
            카카오·구글·네이버 소셜 계정(OAuth)으로 가입하며, 가입 절차에서 본 약관과
            개인정보처리방침에 대한 필수 동의를 받습니다. 약관이 개정되면 재동의를 요청할 수
            있습니다. 동의 이력은 시점·버전과 함께 보관됩니다.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-ink">제4조 (펫 헬스 정보 분리 동의)</h2>
          <p>
            반려견의 알레르기·만성질환 등 헬스 정보는 별도 동의 절차를 거쳐 분리 보관되며, 본인만
            접근할 수 있습니다. 동의하지 않아도 기본 서비스 이용에는 제한이 없습니다.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-ink">제5조 (위치 정보)</h2>
          <p>
            현 위치 기반 추천은 별도의 위치 정보 이용 동의 후 제공됩니다. 출발지 좌표는 추천 계산에
            사용된 뒤 24시간 내 평문이 무효화되고, 암호화된 형태로 90일까지 보관 후 영구 삭제됩니다.
            방문 인증 사진의 위치 메타데이터(EXIF)는 인증 유효성 확인 목적으로만 사용됩니다.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-ink">제6조 (게시물 및 방문 인증)</h2>
          <ul className="list-disc pl-5">
            <li>
              회원이 작성한 후기·사진의 권리는 회원에게 있으며, 서비스는 서비스 운영·노출에 필요한
              범위에서 이를 사용할 수 있습니다.
            </li>
            <li>욕설·광고 등 부적절한 게시물은 자동 필터 및 신고 누적(5회) 시 숨김 처리됩니다.</li>
            <li>
              허위 방문 인증(위치·시각 조작 등)은 금지되며, 적발 시 인증 무효화 및 이용 제한이 될 수
              있습니다.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="font-semibold text-ink">제7조 (이용 제한)</h2>
          <p>
            비정상적 대량 호출은 요청 제한(Rate Limit)으로 차단될 수 있으며, 약관 위반·어뷰징
            행위에는 서비스 이용 제한 조치가 취해질 수 있습니다.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-ink">제8조 (면책)</h2>
          <p>
            서비스가 제공하는 한적도·운영시간 등 정보는 공공 데이터와 추정 모델에 기반한 참고
            정보로, 실제와 차이가 있을 수 있습니다. 방문 전 현장 확인을 권장하며, 정보 오차로 인한
            손해에 대해 서비스는 고의·중과실이 없는 한 책임지지 않습니다.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-ink">제9조 (약관 변경 및 준거법)</h2>
          <p>
            약관 변경 시 서비스 내 공지하며, 중요한 변경은 재동의를 받습니다. 본 약관은 대한민국
            법률을 따릅니다.
          </p>
        </section>
        <section className="text-xs text-muted">
          ※ 본 페이지는 베타 단계 문서입니다. 정식 본문은 법무 검토 후 확정됩니다.
        </section>
      </article>
    </main>
  );
}
