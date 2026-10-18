'use client';

import {
  saveInterviewEvaluationAction,
  type EvaluationFormState,
} from '@/actions/interview.actions';
import { Button } from '@/components/ui/Button';
import { Field, FormError, FormSuccess, Input, Select, TextArea } from '@/components/ui/Form';
import {
  EVALUATION_CRITERIA,
  EVALUATION_DATA_FIELDS,
  EVALUATION_MAX_TOTAL,
  EVALUATION_SECTIONS,
  RECOMMENDATIONS,
  RECOMMENDATION_LABELS,
  isEvaluationComplete,
  type EvaluationCriterion,
  type EvaluationCriterionKey,
} from '@/domain/interviews/evaluation';
import { notesFieldName, scoreFieldName } from '@/domain/interviews/evaluation.schema';
import type { QueueEntry } from '@/domain/interviews/interview.types';
import { ClipboardCheck } from 'lucide-react';
import { useActionState, useState, type ReactNode } from 'react';

const EMPTY_STATE: EvaluationFormState = { error: null, savedAt: null };

function initialScores(entry: QueueEntry): Record<EvaluationCriterionKey, string> {
  return Object.fromEntries(
    EVALUATION_CRITERIA.map((criterion) => [
      criterion.key,
      entry.evaluation?.scores[criterion.key]?.score?.toString() ?? '',
    ]),
  ) as Record<EvaluationCriterionKey, string>;
}

function criteriaTotal(
  scores: Record<EvaluationCriterionKey, string>,
  criteria: readonly EvaluationCriterion[],
): number {
  return criteria.reduce((sum, criterion) => sum + (Number(scores[criterion.key]) || 0), 0);
}

/**
 * The evaluation form — one global form for every track: the Data section,
 * three scored sections (Attitude 50, Technical Skills 40, IEEE Knowledge 10),
 * and the Final evaluation with the computed total and a recommendation that is
 * stored separately from the score.
 *
 * Every criterion needs both a score and a note. Pass, reject, and transfer
 * unlock only once the whole form is complete.
 */
export function EvaluationForm({ entry }: { entry: QueueEntry }) {
  const [state, formAction, pending] = useActionState(saveInterviewEvaluationAction, EMPTY_STATE);
  const [scores, setScores] = useState(() => initialScores(entry));

  const liveTotal = criteriaTotal(scores, EVALUATION_CRITERIA);
  const complete = isEvaluationComplete(entry.evaluation);

  return (
    <form action={formAction} className="space-y-5">
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

      <FormSection
        title="1 · Data"
        hint="The member's details and the interviewers who filled this form."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <Input value={entry.member.fullName} readOnly disabled />
          </Field>
          <Field label="Position">
            <Input value={entry.member.position ?? '—'} readOnly disabled />
          </Field>
          {EVALUATION_DATA_FIELDS.map((field) => (
            <Field key={field.key} label={field.label} hint="Required">
              <Input
                name={field.key}
                defaultValue={entry.evaluation?.data[field.key] ?? ''}
                required
              />
            </Field>
          ))}
        </div>
      </FormSection>

      {EVALUATION_SECTIONS.map((section, index) => (
        <FormSection
          key={section.key}
          title={`${index + 2} · ${section.label}`}
          hint={`${criteriaTotal(scores, section.criteria)} / ${section.max} points`}
        >
          <div className="space-y-3">
            {section.criteria.map((criterion) => (
              <CriterionRow
                key={criterion.key}
                criterion={criterion}
                score={scores[criterion.key]}
                savedNotes={entry.evaluation?.scores[criterion.key]?.notes ?? ''}
                onScoreChange={(value) =>
                  setScores((previous) => ({ ...previous, [criterion.key]: value }))
                }
              />
            ))}
          </div>
        </FormSection>
      ))}

      <FormSection
        title="5 · Final evaluation"
        hint={`Total ${liveTotal} / ${EVALUATION_MAX_TOTAL} — computed from the criteria above.`}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Total score" hint="Read-only, computed.">
            <Input value={`${liveTotal} / ${EVALUATION_MAX_TOTAL}`} readOnly disabled />
          </Field>
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
        <Field label="Additional notes">
          <TextArea
            name="finalNotes"
            defaultValue={entry.evaluation?.finalNotes ?? ''}
            placeholder="Anything the record should keep — strengths, doubts, follow-ups."
          />
        </Field>
      </FormSection>

      <FormError message={state.error} />
      <FormSuccess message={state.savedAt} />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? 'Saving…' : 'Save evaluation'}
        </Button>
        {!complete && (
          <p className="text-xs text-ieee-gray">
            Pass, reject, and transfer unlock once every criterion has a score and a note, both
            interviewer fields are filled, and a recommendation is chosen.
          </p>
        )}
      </div>
    </form>
  );
}

/** One numbered section of the form, with its running score in the header. */
function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="rounded-xl border border-hairline p-4">
      <legend className="px-1 text-sm font-bold text-ieee-navy">{title}</legend>
      {hint && <p className="mb-3 text-xs text-ieee-gray">{hint}</p>}
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

/** One scored line: the criterion's score box and its required note. */
function CriterionRow({
  criterion,
  score,
  savedNotes,
  onScoreChange,
}: {
  criterion: EvaluationCriterion;
  score: string;
  savedNotes: string;
  onScoreChange: (value: string) => void;
}) {
  const scoreId = scoreFieldName(criterion.key);

  return (
    <div className="grid gap-2 rounded-lg border border-hairline p-3 sm:grid-cols-[9rem_1fr] sm:items-start">
      <label className="text-sm font-semibold text-ieee-navy" htmlFor={scoreId}>
        {criterion.label}
        <span className="mt-0.5 block text-xs font-normal text-ieee-gray">
          out of {criterion.max}
        </span>
      </label>
      <div className="space-y-2">
        <Input
          id={scoreId}
          name={scoreId}
          type="number"
          min={1}
          max={criterion.max}
          step={1}
          required
          inputMode="numeric"
          aria-label={`${criterion.label} score`}
          value={score}
          onChange={(event) => onScoreChange(event.target.value)}
        />
        <TextArea
          name={notesFieldName(criterion.key)}
          rows={2}
          required
          defaultValue={savedNotes}
          placeholder="Notes (required)"
          aria-label={`${criterion.label} notes`}
        />
      </div>
    </div>
  );
}
