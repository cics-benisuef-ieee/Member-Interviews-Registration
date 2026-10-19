import { StatusBadge } from '@/components/features/queue/StatusBadge';
import { formatQueueNumber } from '@/components/features/queue/queue.format';
import { EVALUATION_MAX_TOTAL, RECOMMENDATION_LABELS } from '@/domain/interviews/evaluation';
import { isFinishedStatus } from '@/domain/interviews/interview.constants';
import type { MemberResult } from '@/domain/results/result.types';
import { formatQueueDay } from './results.format';

/**
 * One interview as the member sees it: where and when they interviewed, the
 * board's decision, and — once the evaluation is finished — the score and the
 * recommendation. Interviewer notes stay internal.
 */
export function ResultCard({ result }: { result: MemberResult }) {
  const finished = isFinishedStatus(result.status);

  return (
    <article className="rounded-xl border border-hairline bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ieee-navy">{result.trackName}</p>
          <p className="mt-0.5 text-xs text-ieee-gray">
            {[
              formatQueueDay(result.queueDay),
              formatQueueNumber(result.queueNumber),
              result.memberName,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <StatusBadge status={result.status} />
      </div>

      {finished ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
          {result.overallTotal !== null && (
            <span className="rounded-lg bg-ieee-blue/10 px-2.5 py-1 text-sm font-bold text-ieee-blue">
              {result.overallTotal} / {EVALUATION_MAX_TOTAL}
            </span>
          )}
          {result.recommendation && (
            <span className="text-sm font-semibold text-ieee-navy">
              {RECOMMENDATION_LABELS[result.recommendation]}
            </span>
          )}
        </div>
      ) : (
        <p className="mt-3 border-t border-hairline pt-3 text-xs text-ieee-gray">
          Result pending — your evaluation will appear here once this interview is finished.
        </p>
      )}
    </article>
  );
}
