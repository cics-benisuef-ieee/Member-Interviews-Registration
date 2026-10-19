import { AppShell } from '@/components/layout/AppShell';
import { requireTrackUser } from '@/domain/auth/guards';

/** Board area — only a track's shared login gets this far. */
export default async function BoardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireTrackUser();

  return (
    <AppShell
      user={user}
      navItems={[
        { href: '/board', label: 'Today’s queue' },
        { href: '/board/history', label: 'History' },
      ]}
    >
      {children}
    </AppShell>
  );
}
