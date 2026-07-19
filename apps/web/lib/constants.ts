// 댕로드 FE 데이터 상수 — 내비/도시/요일/펫제한/소스 라벨/시간 경계/데모 데이터.
// 텍스트 카피는 lib/copy.ts, 여기엔 "구조적 데이터"만 둔다.

import type { Recommendation } from '@/lib/types/recommendation';

// ───────── 내비게이션 ─────────
export const NAV_ITEMS = [
  { href: '/', label: '홈' },
  { href: '/recommendations', label: '추천' },
  { href: '/me', label: '마이펫타임' },
  { href: '/login', label: '로그인' },
] as const;

// ───────── 충남 4시 시드 좌표 (PRD §13.3) ─────────
export type CityKey = 'CHEONAN' | 'ASAN' | 'GONGJU' | 'SEOSAN';

export const CHUNGNAM_SEED: Record<CityKey, { lat: number; lng: number; label: string }> = {
  CHEONAN: { lat: 36.8151, lng: 127.1135, label: '천안' },
  ASAN: { lat: 36.7898, lng: 127.0019, label: '아산' },
  GONGJU: { lat: 36.4467, lng: 127.119, label: '공주' },
  SEOSAN: { lat: 36.7848, lng: 126.4503, label: '서산' },
};

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

// ───────── 초기 데모 추천 3곳 (ui_kits 홈 기준) ─────────
// 실제 "지금 추천받기" 응답이 오면 교체됨. 실데이터 연동 시 제거하고 초기값 null 로.
export const DEMO_RECOMMENDATIONS: Recommendation[] = [
  {
    poiId: 'sample-seosan-haemi',
    name: '서산 해미읍성 둘레길',
    address: '충남 서산시 해미면',
    lat: 36.7028,
    lng: 126.5519,
    sourceLabel: '두루누비 코스',
    type: 'TRAIL',
    imageUrl: '/images/ref/poi-1.jpg',
    badges: ['TRAIL_OFFICIAL'],
    sampleSufficient: true,
    reason: {
      distanceKm: 42,
      etaMin: 48,
      quietnessNow: 87,
      quietnessForecast: 92,
      quietnessWeekAvg: 89,
      verifiedCount: 5,
    },
  },
  {
    poiId: 'sample-asan-sinjeong',
    name: '아산 신정호 호수 산책로',
    address: '충남 아산시',
    lat: 36.7757,
    lng: 127.0376,
    sourceLabel: '두루누비 코스',
    type: 'TRAIL',
    imageUrl: '/images/ref/poi-2.jpg',
    badges: ['TRAIL_OFFICIAL'],
    sampleSufficient: true,
    reason: {
      distanceKm: 28,
      etaMin: 32,
      quietnessNow: 79,
      quietnessForecast: 83,
      quietnessWeekAvg: 81,
      verifiedCount: 8,
    },
  },
  {
    poiId: 'sample-gongju-muryeong',
    name: '공주 무령왕릉 인근 야외 카페',
    address: '충남 공주시',
    lat: 36.4609,
    lng: 127.1145,
    sourceLabel: '펫동반 가능',
    type: 'CAFE',
    imageUrl: '/images/ref/poi-3.jpg',
    badges: ['PET_VERIFIED'],
    sampleSufficient: true,
    reason: {
      distanceKm: 55,
      etaMin: 60,
      quietnessNow: 91,
      quietnessForecast: 90,
      quietnessWeekAvg: 88,
      verifiedCount: 3,
    },
  },
];
