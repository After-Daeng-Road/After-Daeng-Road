// 인라인 에러 배너 — role="alert" + 닫기 버튼
// 폼 제출 실패·API 에러 등에서 사용

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      <span>{message}</span>
      <button type="button" onClick={onDismiss} className="text-xs underline">
        닫기
      </button>
    </div>
  );
}
