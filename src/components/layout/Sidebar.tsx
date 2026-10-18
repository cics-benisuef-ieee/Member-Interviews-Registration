import Image from 'next/image';
import { logoutAction } from '@/actions/auth.actions';
import type { SessionUser } from '@/domain/auth/auth.types';
import { NavItemLink } from './NavItemLink';
import type { NavItem } from './nav.types';

interface SidebarProps {
  user: SessionUser;
  items: NavItem[];
}

export function Sidebar({ user, items }: SidebarProps) {
  return (
    <aside className="flex h-full flex-col bg-ieee-navy text-white">
      <div className="flex items-center gap-3 border-b border-white/10 p-5">
        <Image
          src="/logo.png"
          alt="CS/CIS Beni-Suef Chapter logo"
          width={48}
          height={48}
          priority
          className="h-12 w-12 shrink-0 rounded-full"
        />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wider text-ieee-orange uppercase">
            CS/CIS Beni-Suef Chapter
          </p>
          <p className="mt-0.5 text-lg font-bold">Member Interviews</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => (
          <NavItemLink key={item.href} item={item} />
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-semibold">{user.displayName}</p>
        <p className="truncate text-xs text-ieee-cyan">{user.email}</p>
        <form action={logoutAction} className="mt-3">
          <button
            type="submit"
            className="w-full rounded-lg border border-white/20 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
