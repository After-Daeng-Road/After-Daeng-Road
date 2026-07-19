import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  contentTypeToPoiType,
  parsePetFields,
  geohash7,
  CHUNGNAM_CITIES,
  LDONG_REGN_CD,
} from './transform.ts';

test('contentTypeToPoiType 매핑', () => {
  assert.equal(contentTypeToPoiType(25), 'TRAIL'); // 여행코스
  assert.equal(contentTypeToPoiType(39), 'RESTAURANT'); // 음식점
  assert.equal(contentTypeToPoiType(32), 'ACCOMMODATION'); // 숙박
  assert.equal(contentTypeToPoiType(999), 'ATTRACTION'); // 미매핑 → 기본
});

test('parsePetFields — 전구역 동반가능', () => {
  const f = parsePetFields({
    acmpyTypeCd: '전구역 동반가능',
    acmpyPsblCpam: '전 견종 동반 가능',
    acmpyNeedMtr: '목줄 착용',
    etcAcmpyInfo: '맹견 입마개 필수',
  });
  assert.equal(f.petAllowed, true);
  assert.equal(f.petIndoor, true);
  assert.equal(f.petOutdoor, true);
  assert.ok(f.petPolicyText?.includes('목줄'));
});

test('parsePetFields — 실외만', () => {
  const f = parsePetFields({ acmpyTypeCd: '실외 동반가능', acmpyPsblCpam: '소형견(10kg 이하)' });
  assert.equal(f.petIndoor, false);
  assert.equal(f.petOutdoor, true);
  assert.equal(f.petSizeMaxKg, 10);
});

test('parsePetFields — 데이터 없음(미등록)', () => {
  const f = parsePetFields(null);
  assert.equal(f.petAllowed, false);
  assert.equal(f.petIndoor, null);
  const f2 = parsePetFields({ contentid: '123' } as never);
  assert.equal(f2.petAllowed, false);
});

test('geohash7 은 7자리', () => {
  const h = geohash7(36.4555, 127.119);
  assert.equal(h.length, 7);
  assert.equal(geohash7(36.4555, 127.119), h); // 결정적
});

test('CHUNGNAM_CITIES 구성', () => {
  assert.equal(LDONG_REGN_CD, 44);
  assert.equal(CHUNGNAM_CITIES.length, 4);
  const cheonan = CHUNGNAM_CITIES.find((c) => c.name === '천안')!;
  assert.deepEqual(cheonan.signgu, [131, 133]); // 동남구+서북구
  assert.equal(cheonan.sigunguCode, 33040);
});
