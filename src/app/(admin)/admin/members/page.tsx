import { BulkDeleteMembers } from '@/components/features/admin/BulkDeleteMembers';
import { MemberListItem } from '@/components/features/admin/MemberListItem';
import { MemberRegisterForm } from '@/components/features/admin/MemberRegisterForm';
import { MemberSearchForm } from '@/components/features/admin/MemberSearchForm';
import { MemberStatusTally } from '@/components/features/admin/MemberStatusTally';
import { PageHeader } from '@/components/features/shared/PageHeader';
import { Card, CardSubtitle, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { searchMembersWithStatus } from '@/domain/members/member.service';
import { listRegistrationTracks } from '@/domain/tracks/track.service';
import { UserRoundX } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;

  const [members, tracks] = await Promise.all([
    searchMembersWithStatus(q),
    listRegistrationTracks(),
  ]);

  return (
    <>
      <PageHeader title="Members" subtitle="Search, correct, or register members directly." />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Search leads on every screen — it is the page's primary tool. */}
        <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1">
          <MemberSearchForm initialQuery={q} />
        </div>

        {/*
          Registering is secondary. On phones the form sits between the search
          and the member list, so it is never buried below a long list; on wider
          screens it keeps its own column beside the list.
        */}
        <div className="lg:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-1">
          <Card>
            <CardTitle>Register a member</CardTitle>
            <CardSubtitle>Adds them to the chosen track&apos;s queue today.</CardSubtitle>
            <div className="mt-4">
              <MemberRegisterForm tracks={tracks} />
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2 lg:col-start-1 lg:row-start-2">
          {members.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-ieee-gray">
                  Showing <span className="font-semibold text-ieee-navy">{members.length}</span>{' '}
                  {members.length === 1 ? 'member' : 'members'}
                  {q && (
                    <>
                      {' '}
                      matching <span className="font-semibold text-ieee-navy">“{q}”</span>
                    </>
                  )}
                </p>
                <MemberStatusTally members={members} />
              </div>
              <BulkDeleteMembers memberIds={members.map((member) => member.id)} />
            </div>
          )}

          <Card flush>
            {members.length === 0 ? (
              <EmptyState
                icon={<UserRoundX className="h-6 w-6" />}
                title={q ? 'No members match that search' : 'No members yet'}
                hint={
                  q
                    ? 'Try a different name, phone number, or email.'
                    : 'Register the first member to fill this list.'
                }
              />
            ) : (
              <ul>
                {members.map((member) => (
                  <MemberListItem key={member.id} member={member} />
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
