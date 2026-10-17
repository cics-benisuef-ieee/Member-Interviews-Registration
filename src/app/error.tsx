'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/** Generic error boundary — keeps a crash from showing a blank page. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 text-center">
      <h1 className="text-2xl font-bold text-ieee-navy">Something went wrong</h1>
      <p className="mt-2 text-ieee-gray">The page could not be loaded. Try again in a moment.</p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-ieee-blue px-4 py-2 text-sm font-semibold text-white hover:bg-ieee-navy"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-ieee-gray hover:border-ieee-blue hover:text-ieee-blue"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
