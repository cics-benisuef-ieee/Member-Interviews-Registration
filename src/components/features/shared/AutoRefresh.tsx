'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Keeps server-rendered data fresh by re-rendering the current route on an
 * interval — the simplest reliable "live queue" mechanism.
 *
 * It deliberately does nothing while the tab is in the background. A board left
 * open on a desk overnight would otherwise refresh every few seconds for hours,
 * costing a database round trip each time for nobody. Returning to the tab
 * refreshes immediately, so the view is current the moment it is looked at.
 */
export function AutoRefresh({ intervalMs = 10_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const start = () => {
      stop();
      timer = setInterval(() => router.refresh(), intervalMs);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
        return;
      }

      router.refresh();
      start();
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [router, intervalMs]);

  return null;
}
