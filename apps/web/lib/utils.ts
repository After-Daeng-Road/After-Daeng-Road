import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// shadcn/ui 표준 cn 헬퍼 (Tailwind 클래스 병합 + 충돌 해소)
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
