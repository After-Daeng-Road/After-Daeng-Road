// 카운터 — 큰 숫자(브랜드 컬러) + 작은 라벨 (회색)
// 활동 요약·통계 카드 등에서 사용

export function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-base font-bold text-brand">{value}</div>
      <div className="text-[11px] text-gray-500">{label}</div>
    </div>
  );
}
