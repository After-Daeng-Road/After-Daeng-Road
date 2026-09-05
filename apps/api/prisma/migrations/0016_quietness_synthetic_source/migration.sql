-- 0016 — QuietnessSource 에 합성 기준선 값 추가
--
-- 배경:
--   seed.ts 는 base(55/70/80) + (sigungu+weekday*7+hour)%15-5 공식으로 만든 값을
--   source='DATABANK_VISITOR' 로 저장해 왔다. 그 값은 한국관광 데이터랩 방문자 데이터를
--   뜻하는 라벨인데 실제로는 실측이 아니라, DB 만 봐서는 합성과 실측을 구분할 수 없었다.
--
--   seed-datalab.ts 가 실측을 DATABANK_VISITOR 로 적재하므로,
--   합성 기준선은 별도 값으로 분리한다.
--
-- 주의:
--   ALTER TYPE ... ADD VALUE 는 같은 트랜잭션 안에서 그 값을 사용할 수 없다.
--   이 마이그레이션은 값 추가만 하고 사용하지 않으므로 문제없다.

ALTER TYPE "QuietnessSource" ADD VALUE IF NOT EXISTS 'SYNTHETIC_BASELINE';
