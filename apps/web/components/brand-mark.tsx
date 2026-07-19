// 브랜드 마크 — 라운드 타일 로고. 라이트=ivory(밝은 타일·어두운 발), 다크=dark(어두운 타일·밝은 발)
// SVG 자체에 타일 배경이 포함돼 있어 컨테이너 없이 그대로 사용. 워드마크 텍스트 옆에 쓰이므로 aria-hidden.

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block bg-[url('/brand/daengroad-favicon-ivory.svg')] bg-contain bg-center bg-no-repeat dark:bg-[url('/brand/daengroad-favicon-dark.svg')] ${className ?? ''}`}
    />
  );
}
