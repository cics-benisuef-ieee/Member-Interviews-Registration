import { Sidebar } from './Sidebar';
import type { NavItem } from './nav.types';
import type { SessionUser } from '@/domain/auth/auth.types';

interface AppShellProps {
  user: SessionUser;
  navItems: NavItem[];
  children: React.ReactNode;
}

/** Standard signed-in layout: navy sidebar + white content area. */
export function AppShell({ user, navItems, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-surface md:flex">
      <Sidebar user={user} items={navItems} />
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
