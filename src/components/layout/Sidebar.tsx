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
    <aside className="flex flex-col bg-ieee-navy text-white md:min-h-screen md:w-64 md:shrink-0">
      <div className="border-b border-white/10 p-5">
        <p className="text-xs font-semibold tracking-widest text-ieee-orange uppercase">
          IEEE Chapter
        </p>
        <p className="mt-1 text-lg font-bold">Member Interviews</p>
      </div>

      <nav className="flex-1 space-y-1 p-3">
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
