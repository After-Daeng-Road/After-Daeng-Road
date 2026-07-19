// 댕로드 Server Actions 레퍼런스 (프론트엔드 협업용)
// /api-docs 허브 페이지가 이 데이터를 렌더한다.
//
// ⚠️ Server Actions는 REST가 아니다. URL로 fetch하는 게 아니라 @/lib/actions/* 에서
//    함수를 import해서 호출하거나 <form action>으로 부른다. Next.js가 같은 오리진으로
//    직렬화된 인자를 자동 POST한다 (호출용 안정 URL 없음).

export interface ServerActionDoc {
  /** 함수명 */
  name: string;
  /** import 경로 (인라인 폼 액션이면 null) */
  importPath: string | null;
  /** 소스 파일 (repo 상대경로) */
  file: string;
  /** TS 시그니처 */
  signature: string;
  /** 무엇인지 — 이 액션이 하는 일 */
  what: string;
  /** 어디에 사용 — 어떤 화면/기능에서 쓰이는지 */
  usedIn: string;
  /** 로그인 필요 여부 */
  authRequired: boolean;
  /** 입력 (zod 스키마 요약). 인자 없으면 null */
  input: string | null;
  /** 반환형 (성공/에러 유니온) */
  returns: string;
  /** revalidatePath 등 캐시 무효화 */
  revalidates: string;
  /** 부수효과 (DB/외부호출/리다이렉트) */
  sideEffects: string;
  /** 클라이언트 사용 예제 */
  example: string;
  /** 주의사항 (선택) */
  gotcha?: string;
  /** 분류 */
  group: '반려동물' | '리뷰·검증' | '추천' | '알림' | '장소' | '인증';
}

export const serverActions: ServerActionDoc[] = [
  // ---------------- 추천 ----------------
  {
    name: 'searchRecommendations',
    importPath: '@/lib/actions/recommendations',
    file: 'apps/web/lib/actions/recommendations.ts',
    signature:
      'searchRecommendations(input: SearchInput): Promise<{ ok: true; data: { recommendations: unknown[] } } | { ok: false; error: string }>',
    what: '출발지·가용시간·펫을 받아 한적·펫동반 POI 상위 3곳을 추천한다. 서버에서 Supabase Edge Function을 대신 호출하는 얇은 BFF 프록시라, anon/JWT 토큰을 브라우저가 다룰 필요가 없다.',
    usedIn:
      '메인 추천 화면 (시간 슬라이더 → "추천 받기"). HTTP로 치고 싶으면 POST /api/recommend 와 동일 기능 — 클라이언트 컴포넌트에선 이 액션이 더 편하다.',
    authRequired: true,
    input:
      'z.object({ petId: string.uuid().nullable(); timeHours: number.min(1).max(6); startAt: string.datetime(); departure: { lat: number; lng: number } })',
    returns:
      '성공 { ok: true, data: { recommendations } } (Edge Function 원본 JSON). 실패 { ok: false, error } — error ∈ "Unauthorized" | zod 메시지 | `Edge function ${status}`',
    revalidates: "revalidatePath('/me')",
    sideEffects:
      '외부 HTTP: POST ${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/time-slider-recommender (Bearer=session.supabaseAccessToken, apikey=anon). DB 쓰기 없음.',
    example: `import { searchRecommendations } from '@/lib/actions/recommendations';

const res = await searchRecommendations({
  petId, timeHours: 3, startAt: new Date().toISOString(),
  departure: { lat, lng },
});
if (res.ok) setResults(res.data.recommendations);
else setError(res.error);`,
    gotcha: 'departure는 좌표만 받는다(주소 X). 인증은 session.user 존재만 확인.',
    group: '추천',
  },

  // ---------------- 장소(POI) ----------------
  {
    name: 'getPoiDetail',
    importPath: '@/lib/actions/pois',
    file: 'apps/web/lib/actions/pois.ts',
    signature: 'getPoiDetail(input: DetailInput): Promise<{ poi, hourly, verifiedCount } | null>',
    what: 'POI 상세 데이터를 한 번에 묶어서 반환한다: 장소 정보 + 두루누비 코스 + 배지 + 다가오는 예측 + 공개 리뷰(최근 20) + 시간대별 한적도 + 최근 6개월 유효 검증 수. 인증 불필요(공개 로더).',
    usedIn: 'POI 상세 화면 (/poi/[id]) 의 메인 데이터 로더. 지도 핀 클릭 → 상세 진입 시.',
    authRequired: false,
    input:
      'z.object({ poiId: string.uuid(); hour: number.int().min(0).max(23).optional() }) — 단 hour는 현재 미사용(한적도는 오늘 요일 기준).',
    returns:
      '성공 { poi(관계 포함), hourly: {hourSlot,score,sampleSize}[], verifiedCount }. 실패/미존재 시 null — { ok } envelope 아님, null 체크할 것.',
    revalidates: '없음',
    sideEffects: '읽기 전용: poi.findUnique + quietnessScore.findMany + verification.count',
    example: `import { getPoiDetail } from '@/lib/actions/pois';

const detail = await getPoiDetail({ poiId });
if (!detail) return notFound();
render(detail.poi, detail.hourly, detail.verifiedCount);`,
    gotcha: '반환이 { ok } 형태가 아니라 값 또는 null. 반드시 null 가드.',
    group: '장소',
  },

  // ---------------- 리뷰·검증 ----------------
  {
    name: 'createReview',
    importPath: '@/lib/actions/reviews',
    file: 'apps/web/lib/actions/reviews.ts',
    signature:
      'createReview(input: ReviewInput): Promise<{ ok: true; review: Review } | { ok: false; error: string }>',
    what: '공개 POI 리뷰를 작성한다. 인증 → 일일 레이트리밋 → 욕설/광고 필터 → XSS 새니타이즈 후 저장.',
    usedIn: 'POI 상세 화면의 리뷰 작성 폼. 방문 후 별점·후기 남길 때.',
    authRequired: true,
    input:
      'z.object({ poiId: string.uuid(); rating: int.min(1).max(5); body?: string.max(2000); photos: string.url()[].max(8) = [] })',
    returns:
      '성공 { ok: true, review }(status "PUBLIC"). 실패 { ok: false, error } — error ∈ "Unauthorized" | 레이트리밋 메시지 | zod 메시지 | "부적절한 내용이 포함되어 있어요"',
    revalidates: 'revalidatePath(`/poi/${poiId}`)',
    sideEffects: '일일 레이트리밋(Upstash) + 금칙어 필터 + sanitize + review.create',
    example: `import { createReview } from '@/lib/actions/reviews';

const res = await createReview({ poiId, rating: 5, body: '한적하고 좋았어요', photos: [url] });
if (res.ok) router.refresh();
else setError(res.error);`,
    gotcha:
      '레이트리밋 내부 오류(RateLimitError 아닌 예외)는 throw될 수 있으니 try/catch 병행 권장.',
    group: '리뷰·검증',
  },
  {
    name: 'reportReview',
    importPath: '@/lib/actions/reviews',
    file: 'apps/web/lib/actions/reviews.ts',
    signature:
      "reportReview(reviewId: string): Promise<{ ok: true } | { ok: false; error: 'Unauthorized' }>",
    what: '리뷰를 신고한다. 신고 카운트를 1 올리고, 누적 5회가 되면 자동으로 status를 HIDDEN_REPORTED로 숨긴다.',
    usedIn: 'POI 상세 화면 각 리뷰의 "신고" 버튼.',
    authRequired: true,
    input: '없음(zod 검증 없음) — reviewId: string(UUID) 단일 인자를 그대로 전달',
    returns: "성공 { ok: true }. 실패 { ok: false, error: 'Unauthorized' } 만.",
    revalidates: 'revalidatePath(`/poi/${review.poiId}`)',
    sideEffects: 'review.update(reportCount++) → 5 이상이면 status HIDDEN_REPORTED',
    example: `import { reportReview } from '@/lib/actions/reviews';

try {
  const res = await reportReview(review.id);
  if (res.ok) toast('신고 접수됨');
} catch { toast.error('신고 실패'); } // 잘못된 id면 Prisma throw`,
    gotcha:
      '⚠️ zod 검증이 없어 존재하지 않는 reviewId면 에러 객체가 아니라 Prisma가 throw한다. 유효한 UUID를 넘길 것.',
    group: '리뷰·검증',
  },
  {
    name: 'checkIn',
    importPath: '@/lib/actions/verifications',
    file: 'apps/web/lib/actions/verifications.ts',
    signature:
      'checkIn(input: CheckInInput): Promise<{ ok: true; verification: Verification } | { ok: false; error: string }>',
    what: '방문 인증(체크인)을 등록한다. 사진 EXIF의 GPS·촬영시각으로 어뷰징을 막는다: POI 1km 이내 + 7일 이내 촬영이면 isValid=true(한적도·배지에 반영), 아니면 등록은 되지만 미검증.',
    usedIn: 'POI 상세 화면의 "방문 인증" 플로우 (사진 업로드 + 한적/보통/붐빔 평가).',
    authRequired: true,
    input:
      "z.object({ poiId: string.uuid(); evaluation: 'QUIET'|'OK'|'CROWDED'; photoUrl: string.url().nullable(); exif: { lat, lng, takenAt } | null })",
    returns:
      '성공 { ok: true, verification }(계산된 isValid 포함). 실패 { ok: false, error } — "Unauthorized" | 레이트리밋 | zod 메시지',
    revalidates: 'revalidatePath(`/poi/${poiId}`)',
    sideEffects:
      '일일 레이트리밋 + poi 좌표 조회(EXIF 검증) + verification.create. 배지 부여는 DB 트리거가 처리.',
    example: `import { checkIn } from '@/lib/actions/verifications';

const res = await checkIn({ poiId, evaluation: 'QUIET', photoUrl: url, exif: { lat, lng, takenAt: iso } });
if (res.ok) toast(res.verification.isValid ? '검증 완료' : '등록됨(검증 미충족)');
else setError(res.error);`,
    group: '리뷰·검증',
  },

  // ---------------- 반려동물 ----------------
  {
    name: 'createPet',
    importPath: '@/lib/actions/pets',
    file: 'apps/web/lib/actions/pets.ts',
    signature:
      'createPet(input: PetInput): Promise<{ ok: true; pet: Pet } | { ok: false; error: string }>',
    what: '현재 사용자 소유의 반려견 프로필(이름·견종·체중·나이·제약)을 등록한다.',
    usedIn: '마이페이지 반려동물 등록 화면 (/me/pets). 추천 시 펫 선택 대상이 된다.',
    authRequired: true,
    input:
      "z.object({ name: string.min(1).max(20); breed: string.min(1).max(40); weightKg: number.min(0.5).max(80); ageYears: int.min(0).max(30); restrictions: ('CAR_SICK'|'HEAT_SENSITIVE'|'NOISE_SENSITIVE')[] = [] })",
    returns: '성공 { ok: true, pet }. 실패 { ok: false, error } — "Unauthorized" | zod 메시지',
    revalidates: "revalidatePath('/me')",
    sideEffects: 'pet.create({ ...입력, userId: 세션유저 })',
    example: `import { createPet } from '@/lib/actions/pets';

const res = await createPet({ name: '댕댕', breed: '말티즈', weightKg: 3.2, ageYears: 4, restrictions: ['HEAT_SENSITIVE'] });
if (res.ok) router.push('/me');
else setError(res.error);`,
    group: '반려동물',
  },
  {
    name: 'listPets',
    importPath: '@/lib/actions/pets',
    file: 'apps/web/lib/actions/pets.ts',
    signature: 'listPets(): Promise<Pet[]>',
    what: '현재 사용자의 반려견 목록을 등록순으로 반환한다. 데이터 로더용.',
    usedIn: '마이페이지(반려동물 목록)와 추천 폼의 펫 선택 드롭다운.',
    authRequired: true,
    input: null,
    returns: 'Pet[] 배열을 그대로 반환({ ok } envelope 아님). 비로그인 시 빈 배열 [](soft-fail).',
    revalidates: '없음',
    sideEffects: '읽기 전용: pet.findMany(where userId, orderBy createdAt asc)',
    example: `import { listPets } from '@/lib/actions/pets';

const pets = await listPets(); // 로그아웃이면 []
return pets.map((p) => <PetRow key={p.id} pet={p} />);`,
    group: '반려동물',
  },
  {
    name: 'consentPetSensitive',
    importPath: '@/lib/actions/pets',
    file: 'apps/web/lib/actions/pets.ts',
    signature:
      'consentPetSensitive(input: SensitiveInput): Promise<{ ok: true } | { ok: false; error: string }>',
    what: '반려견 민감 건강정보(알러지·질환)를 명시적 동의 하에 별도 테이블에 저장한다. 소유권 검사로 타인 펫 변조를 막는다.',
    usedIn: '마이페이지 반려동물 상세의 민감정보 입력·동의 단계 (개인정보 보호, PRD §14).',
    authRequired: true,
    input:
      'z.object({ petId: string.uuid(); allergies: string.max(40)[].max(20); conditions: string.max(40)[].max(20); consentVer: string })',
    returns:
      '성공 { ok: true }. 실패 { ok: false, error } — "Unauthorized" | zod 메시지 | "Forbidden"(펫 미존재 또는 소유자 불일치)',
    revalidates: "revalidatePath('/me')",
    sideEffects: '소유권 확인(pet.findUnique) → petSensitive.upsert(consentedAt=now, consentVer)',
    example: `import { consentPetSensitive } from '@/lib/actions/pets';

const res = await consentPetSensitive({ petId, allergies: ['닭'], conditions: ['슬개골'], consentVer: 'pet-health-v1.0.0' });
if (!res.ok) setError(res.error); // 소유자 아니면 'Forbidden'`,
    group: '반려동물',
  },

  // ---------------- 알림 ----------------
  {
    name: 'updateNotifySettings',
    importPath: '@/lib/actions/notify-settings',
    file: 'apps/web/lib/actions/notify-settings.ts',
    signature:
      'updateNotifySettings(input: NotifySettings): Promise<{ ok: true } | { ok: false; error: string }>',
    what: '이메일 알림 스케줄(on/off, 발송 시각 HH:MM, 요일 집합)을 저장한다. 일일 추천 이메일(daily-recommend-email 크론)이 이 설정을 참조한다.',
    usedIn: '마이페이지 알림 설정 화면 (/me/settings).',
    authRequired: true,
    input:
      "z.object({ enabled: boolean; time: string /^([01]\\d|2[0-3]):[0-5]\\d$/ (24h); days: ('MON'..'SUN')[].min(1).max(7) })",
    returns: '성공 { ok: true }. 실패 { ok: false, error } — "Unauthorized" | zod 메시지',
    revalidates: "revalidatePath('/me/settings')",
    sideEffects: 'user.update(emailNotifyEnabled/Time/Days)',
    example: `import { updateNotifySettings } from '@/lib/actions/notify-settings';

const res = await updateNotifySettings({ enabled: true, time: '19:30', days: ['MON','WED','FRI'] });
if (!res.ok) toast.error(res.error);
else toast.success('알림 설정 저장됨');`,
    group: '알림',
  },

  // ---------------- 인증 (인라인 폼 액션) ----------------
  {
    name: 'signIn (google / kakao / naver)',
    importPath: null,
    file: 'apps/web/app/login/page.tsx',
    signature:
      "<form action={async () => { 'use server'; await signIn(provider, { redirectTo: callbackUrl }); }}>",
    what: '해당 소셜 프로바이더로 OAuth 로그인을 시작한다. import 불가한 인라인 폼 액션 — 버튼 submit로 호출.',
    usedIn:
      '로그인 화면 (/login) 의 카카오·네이버·구글 버튼. callbackUrl은 페이지 searchParams에서 온다.',
    authRequired: false,
    input: null,
    returns: 'void — OAuth 리다이렉트 후 callbackUrl로 복귀',
    revalidates: '없음',
    sideEffects: 'Auth.js signIn(provider) → 프로바이더 동의화면 리다이렉트 → 세션 수립',
    example: `// /login 페이지의 폼 (서버 컴포넌트)
<form action={async () => { 'use server'; await signIn('kakao', { redirectTo: callbackUrl }); }}>
  <button type="submit">카카오로 시작하기</button>
</form>`,
    gotcha:
      'import해서 재사용 불가(익명 클로저). 다른 곳에서 로그인 트리거하려면 /login 링크 또는 signIn() 직접 호출.',
    group: '인증',
  },
  {
    name: 'signOut (inline)',
    importPath: null,
    file: 'apps/web/app/me/page.tsx',
    signature: "<form action={async () => { 'use server'; await signOut({ redirectTo: '/' }); }}>",
    what: '로그아웃한다. 세션 쿠키를 지우고 홈으로 이동. import 불가한 인라인 폼 액션.',
    usedIn: '마이페이지 (/me) 의 로그아웃 버튼 (로그인 상태에서만 렌더).',
    authRequired: true,
    input: null,
    returns: 'void — signOut 후 "/"로 리다이렉트',
    revalidates: '없음',
    sideEffects: 'Auth.js signOut() 세션 쿠키/JWT 제거 → redirect "/"',
    example: `<form action={async () => { 'use server'; await signOut({ redirectTo: '/' }); }}>
  <button type="submit">로그아웃</button>
</form>`,
    group: '인증',
  },
];

/** 화면/기능 그룹 순서 (허브 렌더용) */
export const serverActionGroups: ServerActionDoc['group'][] = [
  '추천',
  '장소',
  '리뷰·검증',
  '반려동물',
  '알림',
  '인증',
];
