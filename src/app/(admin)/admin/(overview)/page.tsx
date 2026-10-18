import { PageHeader } from '@/components/features/shared/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatCard } from '@/components/ui/StatCard';
import { getTodaySummaries } from '@/domain/interviews/interview.service';
import { ArrowRight, CheckCircle2, Clock, PlayCircle, Users } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const { day, summaries } = await getTodaySummaries();

  const totalWaiting = summaries.reduce((sum, summary) => sum + summary.waitingCount, 0);
  const totalFinished = summaries.reduce((sum, summary) => sum + summary.finishedCount, 0);
  const liveTracks = summaries.filter((summary) => summary.nowServingName).length;

  return (
    <>
      <PageHeader title="Today at a glance" subtitle={`Queue day ${day}`} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Waiting"
          value={totalWaiting}
          tone="orange"
          icon={<Clock className="h-5 w-5" />}
          hint="Members not yet seen"
        />
        <StatCard
          label="In interview"
          value={liveTracks}
          tone="blue"
          icon={<PlayCircle className="h-5 w-5" />}
          hint="Tracks with someone being seen now"
        />
        <StatCard
          label="Finished"
          value={totalFinished}
          tone="green"
          icon={<CheckCircle2 className="h-5 w-5" />}
          hint="Passed, rejected, or moved on"
        />
        <StatCard
          label="Tracks"
          value={summaries.length}
          tone="navy"
          icon={<Users className="h-5 w-5" />}
          hint="Committees taking members today"
        />
      </div>

      <h2 className="mt-8 text-base font-bold tracking-tight text-ieee-navy">
        Open a track&apos;s board
      </h2>
      <p className="mt-1 text-sm text-ieee-gray">
        Every card below opens that track&apos;s live queue, so you can run it exactly as its
        committee would.
      </p>

      {summaries.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={<Users className="h-6 w-6" />}
          title="No tracks yet"
          hint="Create a track and its board will appear here."
        />
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((summary) => {
            const total = summary.waitingCount + summary.finishedCount;

            return (
              <Link
                key={summary.trackId}
                href={`/admin/tracks/${summary.trackId}`}
                className="group"
              >
                <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-raised">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-ieee-navy">{summary.trackName}</h3>
                    {summary.nowServingName ? (
                      <Badge tone="active">Live</Badge>
                    ) : (
                      <Badge tone="neutral">Idle</Badge>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-ieee-gray">
                    {summary.nowServingName ? (
                      <>
                        Interviewing{' '}
                        <span className="font-semibold text-ieee-orange-dark">
                          {summary.nowServingName}
                        </span>
                      </>
                    ) : (
                      'No interview in progress'
                    )}
                  </p>

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

                  <ProgressBar
                    className="mt-3"
                    label={`Progress for ${summary.trackName}`}
                    value={summary.finishedCount}
                    max={total}
                    tone={summary.finishedCount === total ? 'green' : 'blue'}
                  />

                  <p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-ieee-blue opacity-70 transition-opacity group-hover:opacity-100">
                    Open board
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
