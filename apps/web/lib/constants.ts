// 댕로드 FE 데이터 상수 — 내비/도시/요일/펫제한/소스 라벨/시간 경계/데모 데이터.
// 텍스트 카피는 lib/copy.ts, 여기엔 "구조적 데이터"만 둔다.

// ───────── 내비게이션 ─────────
export const NAV_ITEMS = [
  { href: '/', label: '홈' },
  { href: '/recommendations', label: '추천' },
  { href: '/trails', label: '산책로' },
  { href: '/me', label: '마이펫타임' },
  { href: '/login', label: '로그인' },
] as const;

// ───────── 충남 시·군 출발지 (드롭다운) ─────────
// 좌표는 시청·군청 부근. 앞 4곳이 PRD §13.3 베타 서비스 지역이고 나머지는 인접 시군 —
// POI 데이터는 4시 기준이라 먼 시군(태안·금산 등)에서 출발하면 반경 안 후보가 적을 수 있다.
export type DepartureCity = { lat: number; lng: number; label: string };

export const CHUNGNAM_CITIES: readonly DepartureCity[] = [
  { lat: 36.8151, lng: 127.1135, label: '천안' },
  { lat: 36.7898, lng: 127.0019, label: '아산' },
  { lat: 36.4467, lng: 127.119, label: '공주' },
  { lat: 36.7848, lng: 126.4503, label: '서산' },
  { lat: 36.2745, lng: 127.2486, label: '계룡' },
  { lat: 36.1088, lng: 127.4881, label: '금산' },
  { lat: 36.1872, lng: 127.0987, label: '논산' },
  { lat: 36.8897, lng: 126.6458, label: '당진' },
  { lat: 36.3332, lng: 126.6128, label: '보령' },
  { lat: 36.2756, lng: 126.9099, label: '부여' },
  { lat: 36.0802, lng: 126.6919, label: '서천' },
  { lat: 36.6826, lng: 126.8449, label: '예산' },
  { lat: 36.4592, lng: 126.8024, label: '청양' },
  { lat: 36.7456, lng: 126.298, label: '태안' },
  { lat: 36.6013, lng: 126.6608, label: '홍성' },
];

export const DEFAULT_DEPARTURE: DepartureCity = CHUNGNAM_CITIES[0];

// ───────── 요일 (이메일 알림 설정) ─────────
export type DayKey = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export const DAY_ORDER: DayKey[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export const DAY_LABELS: Record<DayKey, string> = {
  MON: '월',
  TUE: '화',
  WED: '수',
  THU: '목',
  FRI: '금',
  SAT: '토',
  SUN: '일',
};

export const DEFAULT_NOTIFY_DAYS: DayKey[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
export const DEFAULT_NOTIFY_TIME = '18:00';

// 펫 민감정보 동의 버전 (consentPetSensitive.consentVer) — 약관 개정 시 갱신
export const CONSENT_VERSION = 'pet-health-v1.0.0';

// 계정 단위 동의 버전 (user_consents.version) — 약관 개정 시 버전을 올리면 재동의 유도
export type ConsentKind = 'TERMS' | 'PRIVACY' | 'LOCATION' | 'MARKETING_EMAIL' | 'PET_HEALTH';

export const CONSENT_VERSIONS: Record<ConsentKind, string> = {
  // 2026-09-05 v1.1 개정 — 기능 전수 반영 (구글 OAuth·방문인증 EXIF·추천이력·북마크·위탁처 등).
  // 버전을 올리면 ConsentGate 가 기존 회원에게 재동의를 요청한다.
  TERMS: 'terms-v1.2.0',
  PRIVACY: 'privacy-v1.2.0',
  LOCATION: 'location-v1.0.0',
  MARKETING_EMAIL: 'marketing-email-v1.0.0',
  PET_HEALTH: CONSENT_VERSION, // 기존 'pet-health-v1.0.0' 과 정렬
};

// 온보딩 시 반드시 받아야 하는 필수 동의 (마케팅·위치는 선택)
export const REQUIRED_CONSENTS: ConsentKind[] = ['TERMS', 'PRIVACY'];

// 민감정보 입력 제약 (액션 zod 와 동일: 항목 최대 20개, 각 40자)
export const SENSITIVE_MAX_ITEMS = 20;
export const SENSITIVE_MAX_LEN = 40;

// ───────── 펫 이동 제한 (PRD §6.1) ─────────
export type RestrictionKey = 'CAR_SICK' | 'HEAT_SENSITIVE' | 'NOISE_SENSITIVE';

export const PET_RESTRICTIONS: Array<{ value: RestrictionKey; label: string }> = [
  { value: 'CAR_SICK', label: '차멀미' },
  { value: 'HEAT_SENSITIVE', label: '더위 민감' },
  { value: 'NOISE_SENSITIVE', label: '소음 민감' },
];

// ───────── 시간 슬라이더 경계 (DESIGN_SYSTEM §5) ─────────
export const TIME_MIN = 1;
export const TIME_MAX = 6;
export const TIME_STEP = 0.5;
export const TIME_DEFAULT = 3;

// ───────── 회원 탈퇴 ─────────
// 'use server' 파일(lib/actions/account.ts)은 async 함수만 export 가능해 상수는 여기 둔다.
// 화면과 서버가 같은 확인 문구를 쓰도록 단일 소스로 관리.
export const DELETE_CONFIRM_TEXT = '탈퇴합니다';
