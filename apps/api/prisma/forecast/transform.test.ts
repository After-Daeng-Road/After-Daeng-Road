import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSpotName,
  SIGUNGU_FORECAST_MAP,
  toExpectedScore,
  matchSpots,
  buildForecastRows,
  MATCHED_CONFIDENCE,
  FALLBACK_CONFIDENCE,
  toIsoForecastDate,
} from '../../supabase/functions/_shared/forecast-transform.ts';

// ── 이름 정규화 ──
// 관광공사가 이 API 의 관광지명을 국문 관광정보 제목과 같은 표기로 내보내지만
// 괄호 주석·시도 접두사·장소 접미사에서 갈린다. 실측 191곳 중 19곳이 여기서 어긋났다.

test('normalizeSpotName — 괄호 주석 제거', () => {
  assert.equal(normalizeSpotName('광덕산(아산)'), '광덕산');
  assert.equal(normalizeSpotName('천호지(단대호수)'), '천호지');
});

test('normalizeSpotName — 시도 접두사 제거', () => {
  assert.equal(normalizeSpotName('충남 해미읍성'), '해미읍성');
  assert.equal(normalizeSpotName('충청남도 독립기념관'), '독립기념관');
});

test('normalizeSpotName — 장소 접미사 제거', () => {
  assert.equal(normalizeSpotName('고마나루터'), '고마나루');
  assert.equal(normalizeSpotName('현충사일원'), '현충사');
});

test('normalizeSpotName — 공백·대소문자 무시', () => {
  assert.equal(normalizeSpotName('신정호 생활체육공원'), normalizeSpotName('신정호생활체육공원'));
});

test('normalizeSpotName — 빈 문자열 안전', () => {
  assert.equal(normalizeSpotName(''), '');
  assert.equal(normalizeSpotName('   '), '');
});

// ── 행정코드 매핑 ──
// 천안은 44130(시)으로 물으면 응답이 없고 동남/서북 두 구로만 답한다.

test('SIGUNGU_FORECAST_MAP — 천안 두 구가 같은 프로젝트 코드로', () => {
  assert.equal(SIGUNGU_FORECAST_MAP['44131'], 33040);
  assert.equal(SIGUNGU_FORECAST_MAP['44133'], 33040);
});

test('SIGUNGU_FORECAST_MAP — 나머지 3시', () => {
  assert.equal(SIGUNGU_FORECAST_MAP['44150'], 33020); // 공주
  assert.equal(SIGUNGU_FORECAST_MAP['44200'], 33050); // 아산
  assert.equal(SIGUNGU_FORECAST_MAP['44210'], 33150); // 서산
});

// ── 집중률 → 한적도 ──
// cnctrRate 는 "가장 붐비는 시기를 100 으로 본 상대값". 한적도는 그 반대 방향이다.

test('toExpectedScore — 혼잡 100 이면 한적 0', () => {
  assert.equal(toExpectedScore('100'), 0);
  assert.equal(toExpectedScore('0'), 100);
  assert.equal(toExpectedScore('58.52'), 41); // 100 - 58.52 = 41.48 → 41
});

test('toExpectedScore — 범위 밖 값은 0~100 으로 자른다', () => {
  assert.equal(toExpectedScore('120'), 0);
  assert.equal(toExpectedScore('-5'), 100);
});

test('toExpectedScore — 숫자가 아니면 null', () => {
  assert.equal(toExpectedScore(''), null);
  assert.equal(toExpectedScore('N/A'), null);
});

// ── 매칭 ──
// "후보가 여럿이면 자동 확정하지 않는다" (peakoff 원칙)

test('matchSpots — 같은 시군구에서 정확히 하나일 때만 매칭', () => {
  const pois = [
    { id: 'p1', name: '해미읍성', sigunguCode: 33150 },
    { id: 'p2', name: '간월암', sigunguCode: 33150 },
    { id: 'p3', name: '해미읍성', sigunguCode: 33020 }, // 다른 시군구 동명
  ];
  const r = matchSpots(['해미읍성'], pois, 33150);
  assert.equal(r.matched.get('해미읍성'), 'p1');
  assert.equal(r.ambiguous.length, 0);
});

test('matchSpots — 후보 다수면 미확정', () => {
  const pois = [
    { id: 'p1', name: '수변공원', sigunguCode: 33050 },
    { id: 'p2', name: '수변 공원', sigunguCode: 33050 }, // 정규화하면 같은 이름
  ];
  const r = matchSpots(['수변공원'], pois, 33050);
  assert.equal(r.matched.size, 0);
  assert.deepEqual(r.ambiguous, ['수변공원']);
});

test('matchSpots — 후보 없으면 미스', () => {
  const pois = [{ id: 'p1', name: '간월암', sigunguCode: 33150 }];
  const r = matchSpots(['남양여관'], pois, 33150);
  assert.equal(r.matched.size, 0);
  assert.deepEqual(r.missed, ['남양여관']);
});

// ── 행 생성 ──
// 매칭된 POI 는 실측 예측, 나머지는 같은 날 시군구 평균. confidence 로 구분한다.

test('buildForecastRows — 매칭 POI 는 실측값 + 높은 confidence', () => {
  const items = [
    { tAtsNm: '해미읍성', baseYmd: '20260921', cnctrRate: '30' },
    { tAtsNm: '간월암', baseYmd: '20260921', cnctrRate: '50' },
  ];
  const pois = [
    { id: 'p1', name: '해미읍성', sigunguCode: 33150 },
    { id: 'p2', name: '간월암', sigunguCode: 33150 },
  ];
  const rows = buildForecastRows(items, pois, 33150);
  const hit = rows.find((r) => r.poiId === 'p1' && r.forecastDate === '2026-09-21');
  assert.equal(hit?.expectedScore, 70);
  assert.equal(hit?.confidence, MATCHED_CONFIDENCE);
});

test('buildForecastRows — 미매칭 POI 는 그날 시군구 평균 + 낮은 confidence', () => {
  const items = [
    { tAtsNm: '해미읍성', baseYmd: '20260921', cnctrRate: '30' }, // score 70
    { tAtsNm: '간월암', baseYmd: '20260921', cnctrRate: '50' }, // score 50
  ];
  const pois = [
    { id: 'p1', name: '해미읍성', sigunguCode: 33150 },
    { id: 'p2', name: '간월암', sigunguCode: 33150 },
    { id: 'p3', name: '○○카페', sigunguCode: 33150 }, // 예측 대상 아님
  ];
  const rows = buildForecastRows(items, pois, 33150);
  const fb = rows.find((r) => r.poiId === 'p3' && r.forecastDate === '2026-09-21');
  assert.equal(fb?.expectedScore, 60); // (70 + 50) / 2
  assert.equal(fb?.confidence, FALLBACK_CONFIDENCE);
});

test('buildForecastRows — 날짜별로 평균을 따로 낸다', () => {
  const items = [
    { tAtsNm: '해미읍성', baseYmd: '20260921', cnctrRate: '30' }, // 70
    { tAtsNm: '해미읍성', baseYmd: '20260922', cnctrRate: '90' }, // 10
  ];
  const pois = [
    { id: 'p1', name: '해미읍성', sigunguCode: 33150 },
    { id: 'p2', name: '○○카페', sigunguCode: 33150 },
  ];
  const rows = buildForecastRows(items, pois, 33150);
  assert.equal(
    rows.find((r) => r.poiId === 'p2' && r.forecastDate === '2026-09-21')?.expectedScore,
    70,
  );
  assert.equal(
    rows.find((r) => r.poiId === 'p2' && r.forecastDate === '2026-09-22')?.expectedScore,
    10,
  );
});

test('buildForecastRows — baseYmd 를 ISO 날짜로 바꾼다', () => {
  const items = [{ tAtsNm: '해미읍성', baseYmd: '20260921', cnctrRate: '30' }];
  const pois = [{ id: 'p1', name: '해미읍성', sigunguCode: 33150 }];
  const rows = buildForecastRows(items, pois, 33150);
  assert.equal(rows[0].forecastDate, '2026-09-21');
});

test('buildForecastRows — 예측 항목이 없으면 폴백도 만들지 않는다', () => {
  const pois = [{ id: 'p1', name: '○○카페', sigunguCode: 33150 }];
  assert.deepEqual(buildForecastRows([], pois, 33150), []);
});

test('buildForecastRows — 값이 깨진 항목은 건너뛴다', () => {
  const items = [
    { tAtsNm: '해미읍성', baseYmd: '20260921', cnctrRate: 'N/A' },
    { tAtsNm: '간월암', baseYmd: '20260921', cnctrRate: '50' },
  ];
  const pois = [
    { id: 'p1', name: '해미읍성', sigunguCode: 33150 },
    { id: 'p2', name: '간월암', sigunguCode: 33150 },
  ];
  const rows = buildForecastRows(items, pois, 33150);
  assert.equal(
    rows.some((r) => r.poiId === 'p1'),
    false,
  );
  assert.equal(rows.find((r) => r.poiId === 'p2')?.expectedScore, 50);
});

// ── 교차 검증에서 지적된 경계 ──

test('buildForecastRows — 정규화하면 같아지는 두 이름이 한 POI 로 모여도 행이 중복되지 않는다', () => {
  // poi_forecasts 는 (poi_id, forecast_date) 유니크다. 중복 행이 나오면 적재가 통째로 실패한다.
  const items = [
    { tAtsNm: '광덕산(아산)', baseYmd: '20260921', cnctrRate: '30' },
    { tAtsNm: '광덕산', baseYmd: '20260921', cnctrRate: '40' },
  ];
  const pois = [{ id: 'p1', name: '광덕산', sigunguCode: 33050 }];
  const rows = buildForecastRows(items, pois, 33050);
  const forP1 = rows.filter((r) => r.poiId === 'p1' && r.forecastDate === '2026-09-21');
  assert.equal(forP1.length, 1);
});

test('buildForecastRows — 같은 항목이 두 번 와도 행은 하나', () => {
  const items = [
    { tAtsNm: '해미읍성', baseYmd: '20260921', cnctrRate: '30' },
    { tAtsNm: '해미읍성', baseYmd: '20260921', cnctrRate: '30' },
  ];
  const pois = [{ id: 'p1', name: '해미읍성', sigunguCode: 33150 }];
  const rows = buildForecastRows(items, pois, 33150);
  assert.equal(rows.filter((r) => r.poiId === 'p1').length, 1);
});

test('buildForecastRows — 어떤 (poi, 날짜) 조합도 두 번 나오지 않는다', () => {
  const items = [
    { tAtsNm: '해미읍성', baseYmd: '20260921', cnctrRate: '30' },
    { tAtsNm: '간월암', baseYmd: '20260921', cnctrRate: '50' },
    { tAtsNm: '해미읍성', baseYmd: '20260922', cnctrRate: '20' },
  ];
  const pois = [
    { id: 'p1', name: '해미읍성', sigunguCode: 33150 },
    { id: 'p2', name: '간월암', sigunguCode: 33150 },
    { id: 'p3', name: '○○카페', sigunguCode: 33150 },
  ];
  const rows = buildForecastRows(items, pois, 33150);
  const keys = rows.map((r) => `${r.poiId}|${r.forecastDate}`);
  assert.equal(new Set(keys).size, keys.length);
});

test('buildForecastRows — 매칭된 POI 는 폴백 행을 받지 않는다', () => {
  // 어떤 날짜엔 자기 값이 있고 다른 날짜엔 없을 때도 폴백으로 덮이면 안 된다
  const items = [
    { tAtsNm: '해미읍성', baseYmd: '20260921', cnctrRate: '30' },
    { tAtsNm: '간월암', baseYmd: '20260922', cnctrRate: '50' },
  ];
  const pois = [
    { id: 'p1', name: '해미읍성', sigunguCode: 33150 },
    { id: 'p2', name: '간월암', sigunguCode: 33150 },
  ];
  const rows = buildForecastRows(items, pois, 33150);
  const p1 = rows.filter((r) => r.poiId === 'p1');
  assert.equal(p1.length, 1);
  assert.equal(p1[0].confidence, MATCHED_CONFIDENCE);
});

test('toIsoForecastDate — 달력에 없는 날짜는 거른다', () => {
  assert.equal(toIsoForecastDate('20260921'), '2026-09-21');
  assert.equal(toIsoForecastDate('20261301'), null); // 13월
  assert.equal(toIsoForecastDate('20260231'), null); // 2월 31일
  assert.equal(toIsoForecastDate('2026092'), null); // 자릿수 부족
  assert.equal(toIsoForecastDate('abcdefgh'), null);
});

test('buildForecastRows — 깨진 날짜 항목은 평균 계산에도 들어가지 않는다', () => {
  const items = [
    { tAtsNm: '해미읍성', baseYmd: '20261301', cnctrRate: '0' }, // 버려야 함
    { tAtsNm: '간월암', baseYmd: '20260921', cnctrRate: '50' },
  ];
  const pois = [
    { id: 'p1', name: '해미읍성', sigunguCode: 33150 },
    { id: 'p2', name: '간월암', sigunguCode: 33150 },
    { id: 'p3', name: '○○카페', sigunguCode: 33150 },
  ];
  const rows = buildForecastRows(items, pois, 33150);
  assert.equal(
    rows.some((r) => r.forecastDate === '2027-01-01'),
    false,
  );
  assert.equal(rows.find((r) => r.poiId === 'p3')?.expectedScore, 50); // 간월암만 평균에 들어감
});

test('buildForecastRows — 중복 항목이 시군구 평균을 한쪽으로 끌지 않는다', () => {
  // 같은 관광지가 두 번 오면 그 값이 평균에 두 번 반영돼 폴백 점수가 치우친다
  const withDup = buildForecastRows(
    [
      { tAtsNm: '해미읍성', baseYmd: '20260921', cnctrRate: '30' },
      { tAtsNm: '해미읍성', baseYmd: '20260921', cnctrRate: '30' },
      { tAtsNm: '간월암', baseYmd: '20260921', cnctrRate: '50' },
    ],
    [
      { id: 'p1', name: '해미읍성', sigunguCode: 33150 },
      { id: 'p2', name: '간월암', sigunguCode: 33150 },
      { id: 'p3', name: '○○카페', sigunguCode: 33150 },
    ],
    33150,
  );
  const withoutDup = buildForecastRows(
    [
      { tAtsNm: '해미읍성', baseYmd: '20260921', cnctrRate: '30' },
      { tAtsNm: '간월암', baseYmd: '20260921', cnctrRate: '50' },
    ],
    [
      { id: 'p1', name: '해미읍성', sigunguCode: 33150 },
      { id: 'p2', name: '간월암', sigunguCode: 33150 },
      { id: 'p3', name: '○○카페', sigunguCode: 33150 },
    ],
    33150,
  );
  assert.equal(
    withDup.find((r) => r.poiId === 'p3')?.expectedScore,
    withoutDup.find((r) => r.poiId === 'p3')?.expectedScore,
  );
  assert.equal(withDup.find((r) => r.poiId === 'p3')?.expectedScore, 60); // (70+50)/2
});

test('matchSpots — 서로 다른 관광지명이 한 POI 로 모이면 확정하지 않는다', () => {
  // 괄호·접미사를 떼서 같아졌다고 같은 장소라는 보장은 없다. 값이 다를 때 먼저 온 쪽을
  // 고르면 입력 순서가 결과를 바꾼다 — 그럴 바엔 확정하지 않는다(peakoff 원칙)
  const pois = [{ id: 'p1', name: '광덕산', sigunguCode: 33050 }];
  const a = matchSpots(['광덕산(아산)', '광덕산'], pois, 33050);
  const b = matchSpots(['광덕산', '광덕산(아산)'], pois, 33050);
  assert.equal(a.matched.size, 0);
  assert.deepEqual(a.ambiguous.sort(), ['광덕산', '광덕산(아산)'].sort());
  assert.deepEqual(a.matched, b.matched); // 순서에 무관
});

test('matchSpots — 같은 이름이 두 번 와도 그것만으로는 모호하지 않다', () => {
  const pois = [{ id: 'p1', name: '해미읍성', sigunguCode: 33150 }];
  const r = matchSpots(['해미읍성', '해미읍성'], pois, 33150);
  assert.equal(r.matched.get('해미읍성'), 'p1');
  assert.equal(r.ambiguous.length, 0);
});
