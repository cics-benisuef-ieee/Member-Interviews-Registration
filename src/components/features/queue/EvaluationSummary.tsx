import {
  EVALUATION_DATA_FIELDS,
  EVALUATION_MAX_TOTAL,
  EVALUATION_SECTIONS,
  RECOMMENDATION_LABELS,
  type InterviewEvaluation,
} from '@/domain/interviews/evaluation';
import { formatTime } from './queue.format';

/**
 * The saved evaluation, read-only: exactly what the board recorded, blanks
 * included, so an edit starts from the real record.
 */
export function EvaluationSummary({ evaluation }: { evaluation: InterviewEvaluation | null }) {
  if (!evaluation) {
    return (
      <p className="rounded-lg bg-surface px-3 py-2 text-sm text-ieee-gray">
        No evaluation was saved for this interview.
      </p>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="rounded-full bg-ieee-blue/10 px-3 py-0.5 font-bold text-ieee-blue">
          {evaluation.total} / {EVALUATION_MAX_TOTAL}
        </span>
        {evaluation.recommendation && (
          <span className="font-semibold text-ieee-navy">
            {RECOMMENDATION_LABELS[evaluation.recommendation]}
          </span>
        )}
        <span className="text-xs text-ieee-gray">
          Last saved {formatTime(evaluation.updatedAt)}
        </span>
      </div>

      <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {EVALUATION_DATA_FIELDS.map((field) => (
          <div key={field.key} className="flex gap-2">
            <dt className="text-ieee-gray">{field.label}</dt>
            <dd className="font-semibold text-ieee-navy">
              {evaluation.data[field.key].trim() || '—'}
            </dd>
          </div>
        ))}
      </dl>

      {EVALUATION_SECTIONS.map((section) => (
        <section key={section.key}>
          <h3 className="text-xs font-bold tracking-widest text-ieee-blue uppercase">
            {section.label}
          </h3>
          <ul className="mt-1 divide-y divide-hairline">
            {section.criteria.map((criterion) => {
              const saved = evaluation.scores[criterion.key];

              return (
                <li key={criterion.key} className="py-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold text-ieee-navy">{criterion.label}</span>
                    <span className="shrink-0 text-ieee-gray">
                      {Number.isFinite(saved?.score)
                        ? `${saved?.score} / ${criterion.max}`
                        : `— / ${criterion.max}`}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-ieee-gray">
                    {saved?.notes?.trim() ? saved.notes : 'No note'}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {evaluation.finalNotes && (
        <section>
          <h3 className="text-xs font-bold tracking-widest text-ieee-blue uppercase">
            Additional notes
          </h3>
          <p className="mt-1 text-ieee-gray">{evaluation.finalNotes}</p>
        </section>
      )}
    </div>
  );
}
