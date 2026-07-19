// 카운터 — 세리프 누메랄(잉크) + 작은 라벨(뮤트) (DESIGN_SYSTEM §5 Stat)
// 활동 요약·통계 카드 등에서 사용

export function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="fig text-[24px] leading-none text-ink">{value}</div>
      <div className="mt-1 text-[11px] text-muted">{label}</div>
    </div>
  );
}
