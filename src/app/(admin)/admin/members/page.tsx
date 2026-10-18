import { BulkDeleteMembers } from '@/components/features/admin/BulkDeleteMembers';
import { MemberListItem } from '@/components/features/admin/MemberListItem';
import { MemberRegisterForm } from '@/components/features/admin/MemberRegisterForm';
import { MemberSearchForm } from '@/components/features/admin/MemberSearchForm';
import { PageHeader } from '@/components/features/shared/PageHeader';
import { Card, CardSubtitle, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { searchMembers } from '@/domain/members/member.repo';
import { listRegistrationTracks } from '@/domain/tracks/track.service';
import { UserRoundX } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;

  const [members, tracks] = await Promise.all([searchMembers(q), listRegistrationTracks()]);

  return (
    <>
      <PageHeader title="Members" subtitle="Search, correct, or register members directly." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <MemberSearchForm initialQuery={q} />

          {members.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
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
                    : 'Register the first member using the form on the right.'
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

        <div>
          <Card>
            <CardTitle>Register a member</CardTitle>
            <CardSubtitle>Adds them to the chosen track&apos;s queue today.</CardSubtitle>
            <div className="mt-4">
              <MemberRegisterForm tracks={tracks} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
