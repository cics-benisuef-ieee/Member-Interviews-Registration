import { AppShell } from '@/components/layout/AppShell';
import { requireAdmin } from '@/domain/auth/guards';

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/tracks', label: 'Tracks' },
  { href: '/admin/members', label: 'Members' },
  { href: '/admin/history', label: 'History' },
];

/** Admin area — only chapter admin accounts get this far. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <AppShell user={user} navItems={NAV_ITEMS}>
      {children}
    </AppShell>
  );
}
