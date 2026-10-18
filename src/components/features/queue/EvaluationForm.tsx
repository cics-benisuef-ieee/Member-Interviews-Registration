'use client';

import {
  saveInterviewEvaluationAction,
  type EvaluationFormState,
} from '@/actions/interview.actions';
import { Button } from '@/components/ui/Button';
import { Field, FormError, FormSuccess, Input, Select, TextArea } from '@/components/ui/Form';
import {
  EVALUATION_MAX_TOTAL,
  EVALUATION_SECTIONS,
  RECOMMENDATIONS,
  RECOMMENDATION_LABELS,
  isEvaluationComplete,
  type EvaluationSectionKey,
} from '@/domain/interviews/evaluation';
import { scoreFieldName } from '@/domain/interviews/evaluation.schema';
import type { QueueEntry } from '@/domain/interviews/interview.types';
import { ClipboardCheck } from 'lucide-react';
import { useActionState, useState } from 'react';

const EMPTY_STATE: EvaluationFormState = { error: null, savedAt: null };

function initialScores(entry: QueueEntry): Record<EvaluationSectionKey, string> {
  return Object.fromEntries(
    EVALUATION_SECTIONS.map((section) => [
      section.key,
      entry.evaluation?.scores[section.key]?.toString() ?? '',
    ]),
  ) as Record<EvaluationSectionKey, string>;
}

/**
 * The five-section evaluation — one global form for every track, 100 points
 * in total, plus a recommendation that is stored separately from the score.
 *
 * Saving is a draft action: it can happen as often as the committee likes
 * while the member is in the queue. Pass, reject, and transfer unlock only
 * once every section carries a score and a recommendation is chosen.
 */
export function EvaluationForm({ entry }: { entry: QueueEntry }) {
  const [state, formAction, pending] = useActionState(saveInterviewEvaluationAction, EMPTY_STATE);
  const [scores, setScores] = useState(() => initialScores(entry));

  const liveTotal = EVALUATION_SECTIONS.reduce(
    (sum, section) => sum + (Number(scores[section.key]) || 0),
    0,
  );
  const complete = isEvaluationComplete(entry.evaluation);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="interviewId" value={entry.id} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest text-ieee-blue uppercase">
          <ClipboardCheck className="h-4 w-4" />
          Evaluation
        </p>
        <p
          className={`rounded-full px-3 py-0.5 text-sm font-bold ${
            complete ? 'bg-ieee-green-dark/10 text-ieee-green-dark' : 'bg-surface text-ieee-gray'
          }`}
          aria-live="polite"
        >
          {liveTotal} / {EVALUATION_MAX_TOTAL}
          {complete && ' · complete'}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {EVALUATION_SECTIONS.map((section) => (
          <Field key={section.key} label={section.label} hint={`0 – ${section.max} points`}>
            <Input
              name={scoreFieldName(section.key)}
              type="number"
              min={0}
              max={section.max}
              required
              inputMode="numeric"
              value={scores[section.key]}
              onChange={(event) =>
                setScores((previous) => ({ ...previous, [section.key]: event.target.value }))
              }
            />
          </Field>
        ))}

        <Field label="Recommendation" hint="Stored separately from the score.">
          <Select
            name="recommendation"
            required
            defaultValue={entry.evaluation?.recommendation ?? ''}
          >
            <option value="" disabled>
              Choose…
            </option>
            {RECOMMENDATIONS.map((recommendation) => (
              <option key={recommendation} value={recommendation}>
                {RECOMMENDATION_LABELS[recommendation]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Final notes">
        <TextArea
          name="finalNotes"
          defaultValue={entry.evaluation?.finalNotes ?? ''}
          placeholder="Anything the record should keep — strengths, doubts, follow-ups."
        />
      </Field>

      <FormError message={state.error} />
      <FormSuccess message={state.savedAt} />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? 'Saving…' : 'Save evaluation'}
        </Button>
        {!complete && (
          <p className="text-xs text-ieee-gray">
            Pass, reject, and transfer unlock once every section is scored and a recommendation is
            chosen.
          </p>
        )}
      </div>
    </form>
  );
}
