import Link from 'next/link';
import { PawPrint } from 'lucide-react';
import { COPY } from '@/lib/copy';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <PawPrint className="mx-auto h-14 w-14 text-brand" aria-hidden />
      <h1 className="mt-3 text-xl font-bold text-ink">{COPY.notFound.title}</h1>
      <p className="mt-2 text-sm text-muted">{COPY.notFound.desc}</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-field bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-hover dark:text-[#20160f]"
      >
        {COPY.common.home}
      </Link>
    </main>
  );
}
