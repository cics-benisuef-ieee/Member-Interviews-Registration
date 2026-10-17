import { MemberListItem } from '@/components/features/admin/MemberListItem';
import { MemberRegisterForm } from '@/components/features/admin/MemberRegisterForm';
import { MemberSearchForm } from '@/components/features/admin/MemberSearchForm';
import { PageHeader } from '@/components/features/shared/PageHeader';
import { Card, CardSubtitle, CardTitle } from '@/components/ui/Card';
import { searchMembers } from '@/domain/members/member.repo';
import { listRegistrationTracks } from '@/domain/tracks/track.service';

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

          <Card flush>
            {members.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-ieee-gray">
                No members found{q ? ` for “${q}”` : ''}.
              </p>
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
            <CardSubtitle>Adds them to the chosen track’s queue today.</CardSubtitle>
            <div className="mt-4">
              <MemberRegisterForm tracks={tracks} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
