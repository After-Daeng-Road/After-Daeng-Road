import Link from 'next/link';
import { Dog } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <Dog className="mx-auto h-14 w-14 text-brand" aria-hidden />
      <h1 className="mt-3 text-xl font-bold">길을 잃었어요</h1>
      <p className="mt-2 text-sm text-gray-600">찾으시는 페이지가 없거나 이동되었어요.</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-md bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-hover"
      >
        홈으로
      </Link>
    </main>
  );
}
