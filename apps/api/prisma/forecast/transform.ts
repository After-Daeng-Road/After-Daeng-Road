// 관광지별 관광객 집중률 예측(TatsCnctrRateService) → poi_forecasts 변환 — 순수 함수
//
// API 응답에는 contentId 도 좌표도 없고 관광지명(tAtsNm)만 있다. 그래서 우리 pois 와는
// 이름으로만 붙일 수 있다. stampTrip·peakoff 가 같은 문제를 풀 때 쓴 방식을 따른다:
// 정규화한 이름이 같은 시군구 안에서 정확히 하나일 때만 매칭하고, 여럿이면 확정하지 않는다.
//
// 실측(2026-09-20, 충남 4시): 예측 관광지 191곳 중 172곳(90.1%) 매칭, 후보 다수 1건.

/** 예측 API 응답 항목 중 우리가 쓰는 필드 */
export type ForecastItem = {
  tAtsNm: string;
  baseYmd: string;
  cnctrRate: string;
};

export type PoiRef = {
  id: string;
  name: string;
  sigunguCode: number;
};

export type ForecastRow = {
  poiId: string;
  /** ISO 날짜 (YYYY-MM-DD) */
  forecastDate: string;
  /** 0~100, 높을수록 한적 */
  expectedScore: number;
  confidence: number;
};

/**
 * 관광지명 매칭용 정규화.
 *
 * 관광공사가 이 API 의 관광지명을 국문 관광정보 제목과 같은 표기로 내보내지만
 * 괄호 주석("광덕산(아산)")·시도 접두사("충남 해미읍성")·장소 접미사("고마나루터")에서 갈린다.
 * 실측 미매칭 19곳 중 상당수가 이 세 가지였다.
 */
export function normalizeSpotName(name: string): string {
  return name
    .replace(/\(.*?\)/g, '') // 괄호 주석
    .replace(/^충(청)?남(도)?\s*/, '') // 시도 접두사
    .replace(/(터|앞길|일원)$/, '') // 장소 접미사
    .replace(/\s+/g, '')
    .toLowerCase();
}

/**
 * 예측 API 의 행정코드(44xxx) → 우리 시군구 코드(33xxx).
 *
 * 천안은 44130(시)으로 물으면 응답이 없고 동남구·서북구로만 답한다(실측). 두 구가 같은
 * 33040 으로 모이므로 호출은 둘로 나누되 POI 조회는 같은 코드를 쓴다.
 */
export const SIGUNGU_FORECAST_MAP: Record<string, number> = {
  '44150': 33020, // 공주
  '44131': 33040, // 천안 동남구
  '44133': 33040, // 천안 서북구
  '44200': 33050, // 아산
  '44210': 33150, // 서산
};

/** 매칭된 POI — 그 장소 자체의 예측이다 */
export const MATCHED_CONFIDENCE = 1.0;
/** 미매칭 POI — 같은 시군구 관광지들의 일별 평균으로 채운 값 */
export const FALLBACK_CONFIDENCE = 0.3;

/**
 * 집중률 → 한적도.
 *
 * cnctrRate 는 "가장 붐비는 시기를 100 으로 본 상대값"이므로 한적도는 방향이 반대다.
 * 파싱 불가면 null 을 돌려주고 호출부가 그 항목을 버린다 — 0 으로 치면 "가장 붐빔"이 된다.
 */
export function toExpectedScore(cnctrRate: string): number | null {
  // Number('') 과 Number('  ') 는 0 이다. 빈 값을 "집중률 0 = 완전 한적"으로 읽으면 안 된다
  if (cnctrRate.trim() === '') return null;
  const n = Number(cnctrRate);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(100 - n)));
}

/**
 * YYYYMMDD → YYYY-MM-DD. 달력에 없는 날짜는 null.
 *
 * 자릿수만 보면 '20260231' 같은 값이 통과해 Date 가 3월 3일로 보정하거나 적재에서 터진다.
 */
export function toIsoForecastDate(ymd: string): string | null {
  if (!/^\d{8}$/.test(ymd)) return null;
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(4, 6));
  const d = Number(ymd.slice(6, 8));
  const dt = new Date(Date.UTC(y, m - 1, d));
  // 보정이 일어났다면 원래 값이 달력에 없는 날짜였다는 뜻이다
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

export type MatchResult = {
  /** 원본 관광지명 → poi id */
  matched: Map<string, string>;
  /** 정규화 결과가 여러 POI 와 겹쳐 확정하지 않은 이름 */
  ambiguous: string[];
  /** 대응하는 POI 가 없는 이름 */
  missed: string[];
};

/**
 * 관광지명 목록을 같은 시군구의 POI 와 맞춘다.
 *
 * 후보가 여럿이면 자동 확정하지 않는다(peakoff 원칙) — 틀린 장소에 예측을 붙이는 것이
 * 예측이 없는 것보다 나쁘다.
 */
export function matchSpots(spotNames: string[], pois: PoiRef[], sigunguCode: number): MatchResult {
  const inSigungu = pois.filter((p) => p.sigunguCode === sigunguCode);

  // 정규화 이름 → POI 들. 한 번만 만들어 이름마다 재순회하지 않는다
  const byName = new Map<string, PoiRef[]>();
  for (const p of inSigungu) {
    const key = normalizeSpotName(p.name);
    if (!key) continue;
    const list = byName.get(key);
    if (list) list.push(p);
    else byName.set(key, [p]);
  }

  const matched = new Map<string, string>();
  const ambiguous: string[] = [];
  const missed: string[] = [];

  for (const spot of spotNames) {
    const key = normalizeSpotName(spot);
    const cand = key ? (byName.get(key) ?? []) : [];
    if (cand.length === 1) matched.set(spot, cand[0].id);
    else if (cand.length > 1) ambiguous.push(spot);
    else missed.push(spot);
  }

  // 반대 방향 충돌: 서로 다른 관광지명이 같은 POI 를 가리키는 경우.
  // 괄호·접미사를 떼서 이름이 같아졌다고 같은 장소라는 보장은 없고, 값이 다를 때 먼저 온
  // 쪽을 채택하면 입력 순서가 결과를 바꾼다. 한 POI 를 두 이름이 주장하면 둘 다 확정하지 않는다
  const claimants = new Map<string, string[]>();
  for (const [spot, poiId] of matched) {
    const list = claimants.get(poiId);
    if (list) list.push(spot);
    else claimants.set(poiId, [spot]);
  }
  for (const spots of claimants.values()) {
    if (spots.length < 2) continue;
    for (const spot of spots) {
      matched.delete(spot);
      ambiguous.push(spot);
    }
  }

  return { matched, ambiguous, missed };
}

/**
 * 한 시군구의 예측 항목들을 poi_forecasts 행으로 바꾼다.
 *
 * 매칭된 POI 는 그 장소의 예측을 그대로 쓰고(confidence 1.0), 매칭되지 않은 POI 는
 * 같은 날 그 시군구 관광지들의 평균을 쓴다(confidence 0.3). 지금 한적도가 시군구 단위인 것과
 * 같은 입도이고, confidence 로 구분해두면 화면이 나중에 "지역 평균"이라고 달리 말할 수 있다.
 */
export function buildForecastRows(
  items: ForecastItem[],
  pois: PoiRef[],
  sigunguCode: number,
): ForecastRow[] {
  const spotNames = [...new Set(items.map((i) => i.tAtsNm).filter(Boolean))];
  const { matched } = matchSpots(spotNames, pois, sigunguCode);

  // poi_forecasts 는 (poi_id, forecast_date) 유니크다. 중복 행이 하나라도 생기면 적재 전체가
  // 실패하므로 키로 모은다. 서로 다른 관광지명이 정규화 후 같은 POI 로 모이거나
  // ("광덕산(아산)" · "광덕산") API 가 같은 항목을 두 번 주면 실제로 중복이 난다.
  const byKey = new Map<string, ForecastRow>();
  const key = (poiId: string, date: string) => `${poiId}|${date}`;

  // 날짜별 점수 합 — 폴백 평균을 내는 데 쓴다. 매칭 여부와 무관하게 그 시군구의 실제 예측이다
  const byDate = new Map<string, { sum: number; n: number }>();
  // 같은 (관광지, 날짜)가 두 번 오면 그 장소가 평균에 두 배로 반영돼 지역 평균이 치우친다
  const counted = new Set<string>();

  for (const item of items) {
    const date = toIsoForecastDate(item.baseYmd);
    const score = toExpectedScore(item.cnctrRate);
    if (date === null || score === null) continue;

    const spotKey = `${normalizeSpotName(item.tAtsNm)}|${date}`;
    if (counted.has(spotKey)) continue;
    counted.add(spotKey);

    const acc = byDate.get(date);
    if (acc) {
      acc.sum += score;
      acc.n += 1;
    } else {
      byDate.set(date, { sum: score, n: 1 });
    }

    const poiId = matched.get(item.tAtsNm);
    // 먼저 온 값을 남긴다 — 어느 쪽을 골라도 근거가 같으므로 결과를 결정적으로만 만든다
    if (poiId && !byKey.has(key(poiId, date))) {
      byKey.set(key(poiId, date), {
        poiId,
        forecastDate: date,
        expectedScore: score,
        confidence: MATCHED_CONFIDENCE,
      });
    }
  }

  if (byDate.size === 0) return [...byKey.values()];

  // 매칭된 POI 는 자기 값을 가졌으므로 폴백 대상에서 뺀다. 특정 날짜에 자기 값이 없더라도
  // 지역 평균으로 덮지 않는다 — 그 장소의 예측이 있다는 표시(confidence 1.0)를 흐리지 않기 위해서다
  const matchedPoiIds = new Set(matched.values());
  const fallbackPois = pois.filter(
    (p) => p.sigunguCode === sigunguCode && !matchedPoiIds.has(p.id),
  );

  for (const [date, acc] of byDate) {
    const avg = Math.round(acc.sum / acc.n);
    for (const p of fallbackPois) {
      if (byKey.has(key(p.id, date))) continue;
      byKey.set(key(p.id, date), {
        poiId: p.id,
        forecastDate: date,
        expectedScore: avg,
        confidence: FALLBACK_CONFIDENCE,
      });
    }
  }

  return [...byKey.values()];
}
