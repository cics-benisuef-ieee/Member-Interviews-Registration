import { Badge } from '@/components/ui/Badge';
import { isEvaluationComplete, RECOMMENDATION_LABELS } from '@/domain/interviews/evaluation';
import type { QueueEntry } from '@/domain/interviews/interview.types';
import { EvaluationForm } from './EvaluationForm';
import { formatQueueNumber, formatTime } from './queue.format';
import { ServingActions } from './ServingActions';

interface NowServingProps {
  entry: QueueEntry;
  availableTracks: { id: string; name: string }[];
}

/** The member currently being interviewed — the loudest element on screen. */
export function NowServing({ entry, availableTracks }: NowServingProps) {
  const evaluation = entry.evaluation;
  const complete = isEvaluationComplete(evaluation);
  const unfinishedHint =
    'Save a complete evaluation first — every criterion with a note, both interviewer fields, and a recommendation.';

  return (
    <section className="rounded-xl border-2 border-ieee-orange-dark bg-white p-6 shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-ieee-orange-dark uppercase">
            Now interviewing
          </p>
          <p className="mt-2 text-3xl font-bold text-ieee-navy">{entry.member.fullName}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ieee-gray">
            <Badge tone="waiting">Queue {formatQueueNumber(entry.queueNumber)}</Badge>
            {evaluation && (
              <Badge tone={complete ? 'passed' : 'waiting'}>
                {evaluation.total}/100
                {complete
                  ? evaluation.recommendation
                    ? ` · ${RECOMMENDATION_LABELS[evaluation.recommendation]}`
                    : ''
                  : ' · draft'}
              </Badge>
            )}
            <span>Started {formatTime(entry.startedAt)}</span>
            {entry.member.phone && <span>· {entry.member.phone}</span>}
            {entry.sourceTrackName && <span>· sent from {entry.sourceTrackName}</span>}
          </div>
        </div>

        <ServingActions
          interviewId={entry.id}
          availableTracks={availableTracks}
          complete={complete}
          unfinishedHint={unfinishedHint}
        />
      </div>

      <div className="mt-5 border-t border-hairline pt-4">
        <EvaluationForm entry={entry} />
      </div>
    </section>
  );
}
