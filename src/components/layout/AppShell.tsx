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
    <>
      <div className="fixed inset-y-0 left-0 z-10 hidden h-screen w-64 md:block">
        <Sidebar user={user} items={navItems} />
      </div>
      <div className="min-h-screen w-full md:pl-64">
        <main className="w-full p-4 md:p-8">{children}</main>
      </div>
    </>
  );
}
