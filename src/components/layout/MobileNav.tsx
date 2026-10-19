'use client';

import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

interface MobileNavProps {
  /**
   * The server-rendered Sidebar (nav, identity, sign-out), passed down from the
   * server layout. Keeping it a prop means no server-only code moves to the
   * client bundle — the drawer simply renders what the desktop sidebar would.
   */
  sidebar: ReactNode;
}

/**
 * Mobile chrome for the signed-in areas: a sticky top bar with a hamburger that
 * opens a slide-over drawer holding the full desktop Sidebar — nav, the signed
 * in account, and sign out — which would otherwise be unreachable below `md`.
 *
 * The drawer closes on navigation, on Escape, and on a tap of the backdrop, and
 * locks page scroll while it is open.
 */
export function MobileNav({ sidebar }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Tapping a link should reveal the page, not leave the panel covering it.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div className="sticky top-0 z-20 md:hidden">
      <div className="flex items-center gap-3 bg-gradient-navy px-4 py-3 text-white shadow-md shadow-ieee-navy/30">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          aria-controls="mobile-drawer"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/20 transition-colors hover:bg-white/10"
        >
          <Menu className="h-5 w-5" />
        </button>
        <p className="truncate text-sm font-bold">Member Interviews</p>
      </div>

      {open && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-ieee-navy/50"
          />

          <div id="mobile-drawer" className="absolute inset-y-0 left-0 w-72 max-w-[85%] shadow-pop">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
              className="absolute top-3 right-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}
    </div>
  );
}
