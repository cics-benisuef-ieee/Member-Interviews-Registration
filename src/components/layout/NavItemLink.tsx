'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from './nav.types';

/** Highlights the nav link for the current section. */
export function NavItemLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      className={cn(
        'block rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
        isActive ? 'bg-ieee-orange text-ieee-navy' : 'text-white hover:bg-white/10',
      )}
    >
      {item.label}
    </Link>
  );
}
