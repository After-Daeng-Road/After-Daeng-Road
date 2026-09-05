import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  contentTypeToPoiType,
  parsePetFields,
  geohash7,
  CHUNGNAM_CITIES,
  LDONG_REGN_CD,
  parseHomepage,
  cleanOverview,
  mergeImageUrls,
  parseUseTime,
  isOpenAtHour,
  pickIntroFields,
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

// ─── detailCommon2 / detailImage2 응답 정제 (2026-09-05 실응답 기준) ───

test('parseHomepage — HTML 앵커에서 href 추출', () => {
  const raw =
    '<a href="http://xn--o39am5bv7vomeopa05vdxb.gajagaja.co.kr/#none" target="_blank" title="새창 : 서산 유기방가옥 홈페이지로 이동">http://유기방가옥.gajagaja.co.kr/</a>';
  assert.equal(parseHomepage(raw), 'http://xn--o39am5bv7vomeopa05vdxb.gajagaja.co.kr/#none');
});

test('parseHomepage — 순수 URL 은 그대로', () => {
  assert.equal(parseHomepage('http://chunjangdae.or.kr/'), 'http://chunjangdae.or.kr/');
  assert.equal(parseHomepage('https://a.example.com'), 'https://a.example.com');
});

test('parseHomepage — 스킴 없으면 https 부여', () => {
  assert.equal(parseHomepage('www.oliveyoung.co.kr'), 'https://www.oliveyoung.co.kr');
});

test('parseHomepage — 빈 값은 null', () => {
  assert.equal(parseHomepage(''), null);
  assert.equal(parseHomepage('   '), null);
  assert.equal(parseHomepage(undefined), null);
  assert.equal(parseHomepage('<a href="">빈 링크</a>'), null);
});

test('cleanOverview — 평문은 trim 만', () => {
  assert.equal(
    cleanOverview('  춘장대해수욕장은 완만한 경사와  '),
    '춘장대해수욕장은 완만한 경사와',
  );
});

test('cleanOverview — HTML 태그 제거 + 엔티티 디코드', () => {
  assert.equal(cleanOverview('가옥이며<br>향토사적<br />건축학적'), '가옥이며 향토사적 건축학적');
  assert.equal(
    cleanOverview('안채&amp;행랑채 &lt;중요&gt; &quot;민속&quot;&nbsp;자료'),
    '안채&행랑채 <중요> "민속" 자료',
  );
});

test('cleanOverview — 빈 값은 null', () => {
  assert.equal(cleanOverview(''), null);
  assert.equal(cleanOverview('   '), null);
  assert.equal(cleanOverview(undefined), null);
  assert.equal(cleanOverview('<br><br>'), null);
});

test('mergeImageUrls — 대표이미지 뒤에 상세이미지 append', () => {
  const merged = mergeImageUrls(
    ['https://t.kr/a.jpg'],
    ['https://t.kr/b.jpg', 'https://t.kr/c.jpg'],
  );
  assert.deepEqual(merged, ['https://t.kr/a.jpg', 'https://t.kr/b.jpg', 'https://t.kr/c.jpg']);
});

test('mergeImageUrls — http/https 차이는 같은 이미지로 보고 중복 제거', () => {
  const merged = mergeImageUrls(
    ['https://t.kr/a.jpg'],
    ['http://t.kr/a.jpg', 'https://t.kr/b.jpg'],
  );
  assert.deepEqual(merged, ['https://t.kr/a.jpg', 'https://t.kr/b.jpg']);
});

test('mergeImageUrls — http 는 https 로 정규화', () => {
  assert.deepEqual(mergeImageUrls([], ['http://t.kr/a.jpg']), ['https://t.kr/a.jpg']);
});

test('mergeImageUrls — 빈 입력과 빈 문자열 처리', () => {
  assert.deepEqual(mergeImageUrls([], []), []);
  assert.deepEqual(mergeImageUrls(['https://t.kr/a.jpg'], []), ['https://t.kr/a.jpg']);
  assert.deepEqual(mergeImageUrls([], ['', '  ']), []);
});

// ─── detailIntro2 운영시간 (2026-09-05 실응답 기준) ───

test('parseUseTime — 상시 개방은 0~24', () => {
  assert.deepEqual(parseUseTime('상시 개방'), { openFrom: 0, openTo: 24 });
  assert.deepEqual(parseUseTime('상시개방'), { openFrom: 0, openTo: 24 });
  assert.deepEqual(parseUseTime('24시간'), { openFrom: 0, openTo: 24 });
  assert.deepEqual(parseUseTime('연중 상시 개방'), { openFrom: 0, openTo: 24 });
});

test('parseUseTime — HH:MM 범위', () => {
  assert.deepEqual(parseUseTime('08:00~17:00'), { openFrom: 8, openTo: 17 });
  assert.deepEqual(parseUseTime('09:00 ~ 18:00'), { openFrom: 9, openTo: 18 });
  assert.deepEqual(parseUseTime('10:00-19:00'), { openFrom: 10, openTo: 19 });
});

test('parseUseTime — 여러 범위면 첫 번째만', () => {
  assert.deepEqual(parseUseTime('하절기 06:00~21:00 / 동절기 07:00~18:00'), {
    openFrom: 6,
    openTo: 21,
  });
});

test('parseUseTime — 파싱 불가는 null (추천에서 시간 판단 제외)', () => {
  assert.deepEqual(parseUseTime('기상여건에 따라 통제 되므로 자세한 사항은 홈페이지 참조'), {
    openFrom: null,
    openTo: null,
  });
  assert.deepEqual(parseUseTime(''), { openFrom: null, openTo: null });
  assert.deepEqual(parseUseTime(undefined), { openFrom: null, openTo: null });
});

test('parseUseTime — 분 단위는 시각으로 절삭·반올림하지 않고 시(hour)만 취한다', () => {
  assert.deepEqual(parseUseTime('09:30~18:30'), { openFrom: 9, openTo: 18 });
});

test('isOpenAtHour — 일반 영업시간', () => {
  assert.equal(isOpenAtHour(8, 17, 10), true);
  assert.equal(isOpenAtHour(8, 17, 8), true);
  assert.equal(isOpenAtHour(8, 17, 17), false); // 폐장 시각은 이미 닫힘
  assert.equal(isOpenAtHour(8, 17, 19), false);
  assert.equal(isOpenAtHour(8, 17, 7), false);
});

test('isOpenAtHour — 상시 개방과 자정 넘김', () => {
  assert.equal(isOpenAtHour(0, 24, 3), true);
  assert.equal(isOpenAtHour(22, 2, 23), true); // 야간 영업
  assert.equal(isOpenAtHour(22, 2, 1), true);
  assert.equal(isOpenAtHour(22, 2, 12), false);
});

test('isOpenAtHour — 정보 없으면 판단하지 않고 true', () => {
  assert.equal(isOpenAtHour(null, null, 23), true);
  assert.equal(isOpenAtHour(8, null, 23), true);
});

test('pickIntroFields — 관광지(12)', () => {
  const f = pickIntroFields({
    usetime: '08:00~17:00',
    restdate: '연중무휴',
    parking: '가능',
    infocenter: '041-663-4326',
  });
  assert.equal(f.useTimeText, '08:00~17:00');
  assert.equal(f.restDateText, '연중무휴');
  assert.equal(f.parkingText, '가능');
  assert.equal(f.infoCenter, '041-663-4326');
});

test('pickIntroFields — 레포츠(28)는 접미사가 붙는다', () => {
  const f = pickIntroFields({
    usetimeleports: '09:00~18:00',
    restdateleports: '월요일',
    infocenterleports: '041-000-0000',
  });
  assert.equal(f.useTimeText, '09:00~18:00');
  assert.equal(f.restDateText, '월요일');
  assert.equal(f.infoCenter, '041-000-0000');
  assert.equal(f.parkingText, null);
});

test('pickIntroFields — 쇼핑(38)은 opentime', () => {
  const f = pickIntroFields({ opentime: '10:00~22:00', restdateshopping: '설날' });
  assert.equal(f.useTimeText, '10:00~22:00');
  assert.equal(f.restDateText, '설날');
});

test('pickIntroFields — 빈 응답', () => {
  assert.deepEqual(pickIntroFields(null), {
    useTimeText: null,
    restDateText: null,
    parkingText: null,
    infoCenter: null,
  });
  assert.deepEqual(pickIntroFields({ usetime: '   ' }).useTimeText, null);
});
