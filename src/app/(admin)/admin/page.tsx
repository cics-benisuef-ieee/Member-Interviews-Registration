import { PageHeader } from '@/components/features/shared/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { getTodaySummaries } from '@/domain/interviews/interview.service';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const { day, summaries } = await getTodaySummaries();
  const totalWaiting = summaries.reduce((sum, summary) => sum + summary.waitingCount, 0);

  return (
    <>
      <PageHeader
        title="Today at a glance"
        subtitle={`Queue day ${day}`}
        actions={<Badge tone="waiting">{totalWaiting} waiting overall</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summaries.map((summary) => (
          <Card key={summary.trackId}>
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-bold text-ieee-navy">{summary.trackName}</h2>
              {summary.nowServingName && <Badge tone="active">Live</Badge>}
            </div>

            {summary.nowServingName ? (
              <p className="mt-2 text-sm text-ieee-gray">
                Interviewing{' '}
                <span className="font-semibold text-ieee-orange-dark">
                  {summary.nowServingName}
                </span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-ieee-gray">No interview in progress</p>
            )}

            <div className="mt-4 flex gap-4 text-sm">
              <p>
                <span className="font-bold text-ieee-navy">{summary.waitingCount}</span>{' '}
                <span className="text-ieee-gray">waiting</span>
              </p>
              <p>
                <span className="font-bold text-ieee-navy">{summary.finishedCount}</span>{' '}
                <span className="text-ieee-gray">finished</span>
              </p>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
