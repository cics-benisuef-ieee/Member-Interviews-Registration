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
  isDraftComplete,
  isEvaluationComplete,
  missingRequirements,
  parseScore,
  scoresTotal,
  sectionProgress,
  type EvaluationCriterion,
  type EvaluationCriterionKey,
  type EvaluationDataKey,
  type EvaluationDraft,
  type EvaluationDraftScores,
  type Recommendation,
} from '@/domain/interviews/evaluation';
import { notesFieldName, scoreFieldName } from '@/domain/interviews/evaluation.schema';
import type { QueueEntry } from '@/domain/interviews/interview.types';
import { Circle, ClipboardCheck } from 'lucide-react';
import { useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

const EMPTY_STATE: EvaluationFormState = { error: null, savedAt: null, kind: null, total: null };

/** How long the local draft waits after the last keystroke before writing. */
const AUTOSAVE_DELAY_MS = 800;

/** Everything the form can hold — the shape both the local draft and the state use. */
interface FormValues {
  data: Record<EvaluationDataKey, string>;
  scores: Record<EvaluationCriterionKey, string>;
  notes: Record<EvaluationCriterionKey, string>;
  recommendation: string;
  finalNotes: string;
}

/** The saved evaluation on the row, as the fields would show it with no local work. */
function serverValues(entry: QueueEntry): FormValues {
  const evaluation = entry.evaluation;

  return {
    data: {
      interviewerTechnical: evaluation?.data.interviewerTechnical ?? '',
      interviewerAttitude: evaluation?.data.interviewerAttitude ?? '',
    },
    scores: Object.fromEntries(
      EVALUATION_CRITERIA.map((criterion) => [
        criterion.key,
        evaluation?.scores[criterion.key]?.score?.toString() ?? '',
      ]),
    ) as Record<EvaluationCriterionKey, string>,
    notes: Object.fromEntries(
      EVALUATION_CRITERIA.map((criterion) => [
        criterion.key,
        evaluation?.scores[criterion.key]?.notes ?? '',
      ]),
    ) as Record<EvaluationCriterionKey, string>,
    recommendation: evaluation?.recommendation ?? '',
    finalNotes: evaluation?.finalNotes ?? '',
  };
}

function valuesEqual(a: FormValues, b: FormValues): boolean {
  return (
    a.data.interviewerTechnical === b.data.interviewerTechnical &&
    a.data.interviewerAttitude === b.data.interviewerAttitude &&
    a.recommendation === b.recommendation &&
    a.finalNotes === b.finalNotes &&
    EVALUATION_CRITERIA.every(
      (criterion) =>
        a.scores[criterion.key] === b.scores[criterion.key] &&
        a.notes[criterion.key] === b.notes[criterion.key],
    )
  );
}

function draftKey(interviewId: string): string {
  return `ieee-evaluation-draft:${interviewId}`;
}

/** The unsaved work kept for one interview, or null if there is none. */
function readDraft(
  interviewId: string,
): { savedAt: string; values: Record<string, unknown> } | null {
  try {
    const raw = window.localStorage.getItem(draftKey(interviewId));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (typeof parsed !== 'object' || parsed === null) return null;

    const draft = parsed as { savedAt?: unknown; values?: unknown };
    if (
      typeof draft.savedAt !== 'string' ||
      typeof draft.values !== 'object' ||
      draft.values === null
    ) {
      return null;
    }

    return { savedAt: draft.savedAt, values: draft.values as Record<string, unknown> };
  } catch {
    // Storage blocked or unreadable — the server copy stands on its own.
    return null;
  }
}

function draftString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function isRecommendation(value: unknown): value is Recommendation {
  return RECOMMENDATIONS.includes(value as Recommendation);
}

/**
 * Layers a local draft over the server copy: anything the draft holds wins,
 * anything it never recorded keeps the saved value. Old or hand-edited drafts
 * cannot put junk in the fields — every value is re-checked on the way in.
 */
function mergeDraft(base: FormValues, draft: Record<string, unknown>): FormValues {
  const data = (draft.data ?? {}) as Record<string, unknown>;
  const scores = (draft.scores ?? {}) as Record<string, unknown>;
  const notes = (draft.notes ?? {}) as Record<string, unknown>;

  return {
    data: {
      interviewerTechnical: draftString(data.interviewerTechnical, base.data.interviewerTechnical),
      interviewerAttitude: draftString(data.interviewerAttitude, base.data.interviewerAttitude),
    },
    scores: Object.fromEntries(
      EVALUATION_CRITERIA.map((criterion) => [
        criterion.key,
        draftString(scores[criterion.key], base.scores[criterion.key]),
      ]),
    ) as Record<EvaluationCriterionKey, string>,
    notes: Object.fromEntries(
      EVALUATION_CRITERIA.map((criterion) => [
        criterion.key,
        draftString(notes[criterion.key], base.notes[criterion.key]),
      ]),
    ) as Record<EvaluationCriterionKey, string>,
    recommendation: isRecommendation(draft.recommendation)
      ? draft.recommendation
      : base.recommendation,
    finalNotes: draftString(draft.finalNotes, base.finalNotes),
  };
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/**
 * The evaluation form — one global form for every track: the Data section,
 * three scored sections (Attitude 50, Technical Skills 40, IEEE Knowledge 10),
 * and the Final evaluation with the computed total and a recommendation that is
 * stored separately from the score.
 *
 * Saving never demands the whole form: "Save draft" stores whatever is filled
 * in so far (in the database and, automatically, in this browser), while "Save
 * evaluation" validates everything the finished form needs. Pass, reject and
 * transfer stay locked until the *saved* evaluation is complete — the same
 * gate the database enforces — and the checklist above the buttons names
 * whatever is still missing.
 */
export function EvaluationForm({ entry }: { entry: QueueEntry }) {
  const [state, formAction, pending] = useActionState(saveInterviewEvaluationAction, EMPTY_STATE);
  const [values, setValues] = useState<FormValues>(() => serverValues(entry));
  const [restoredDraftAt, setRestoredDraftAt] = useState<string | null>(null);
  const [localDraftAt, setLocalDraftAt] = useState<string | null>(null);

  const savedValues = serverValues(entry);

  // The latest server copy, read through a ref so the autosave timer depends
  // only on what was typed — a board refresh every 10s must never restart it.
  const savedValuesRef = useRef(savedValues);
  useEffect(() => {
    savedValuesRef.current = savedValues;
  }, [savedValues]);

  // One restore per mount: local work newer than the saved evaluation wins,
  // so a refresh, a navigation away and back, or an unstart followed by a
  // start never wipes what was typed. A server copy saved later (another
  // committee member finishing the form from their machine) beats the draft.
  useEffect(() => {
    const draft = readDraft(entry.id);
    if (!draft) return;

    const draftSavedAt = Date.parse(draft.savedAt);
    const serverSavedAt = Date.parse(entry.evaluation?.updatedAt ?? '');

    if (Number.isFinite(serverSavedAt) && draftSavedAt <= serverSavedAt) {
      window.localStorage.removeItem(draftKey(entry.id));
      return;
    }

    setValues((previous) => mergeDraft(previous, draft.values));
    setLocalDraftAt(draft.savedAt);
    setRestoredDraftAt(draft.savedAt);
  }, [entry.id, entry.evaluation?.updatedAt]);

  // The draft writes itself shortly after the last keystroke, and forgets
  // itself again once the fields match what the server already holds.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        if (valuesEqual(values, savedValuesRef.current)) {
          window.localStorage.removeItem(draftKey(entry.id));
          setLocalDraftAt(null);
          return;
        }

        const savedAt = new Date().toISOString();
        window.localStorage.setItem(draftKey(entry.id), JSON.stringify({ savedAt, values }));
        setLocalDraftAt(savedAt);
      } catch {
        // Storage full or blocked — "Save draft" is the safety net.
      }
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [entry.id, values]);

  const liveScores = useMemo(
    () =>
      Object.fromEntries(
        EVALUATION_CRITERIA.map((criterion) => [
          criterion.key,
          {
            score: parseScore(values.scores[criterion.key], criterion.max),
            notes: values.notes[criterion.key].trim() || undefined,
          },
        ]),
      ) as EvaluationDraftScores,
    [values],
  );

  const liveDraft: EvaluationDraft = {
    data: values.data,
    scores: liveScores,
    recommendation: values.recommendation ? (values.recommendation as Recommendation) : null,
  };

  const liveTotal = scoresTotal(liveScores);
  const liveComplete = isDraftComplete(liveDraft);
  const missing = missingRequirements(liveDraft);
  const scoredCount = EVALUATION_CRITERIA.filter((criterion) =>
    Number.isFinite(liveScores[criterion.key]?.score),
  ).length;
  const savedComplete = isEvaluationComplete(entry.evaluation);
  const dirty = !valuesEqual(values, savedValues);

  const setData = (key: EvaluationDataKey, value: string) =>
    setValues((previous) => ({ ...previous, data: { ...previous.data, [key]: value } }));
  const setScore = (key: EvaluationCriterionKey, value: string) =>
    setValues((previous) => ({ ...previous, scores: { ...previous.scores, [key]: value } }));
  const setNote = (key: EvaluationCriterionKey, value: string) =>
    setValues((previous) => ({ ...previous, notes: { ...previous.notes, [key]: value } }));

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
            liveComplete
              ? 'bg-ieee-green-dark/10 text-ieee-green-dark'
              : 'bg-surface text-ieee-gray'
          }`}
          aria-live="polite"
        >
          {liveTotal} / {EVALUATION_MAX_TOTAL}
          {liveComplete
            ? ' · complete'
            : ` · ${scoredCount} of ${EVALUATION_CRITERIA.length} scored`}
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
            <Field key={field.key} label={field.label} hint="Required to finish">
              <Input
                name={field.key}
                value={values.data[field.key]}
                onChange={(event) => setData(field.key, event.target.value)}
                required
              />
            </Field>
          ))}
        </div>
      </FormSection>

      {EVALUATION_SECTIONS.map((section, index) => {
        const progress = sectionProgress(liveScores, section);

        return (
          <FormSection
            key={section.key}
            title={`${index + 2} · ${section.label}`}
            hint={`${progress.done} of ${section.criteria.length} complete · ${progress.points} / ${section.max} points`}
          >
            <div className="space-y-3">
              {section.criteria.map((criterion) => (
                <CriterionRow
                  key={criterion.key}
                  criterion={criterion}
                  score={values.scores[criterion.key]}
                  notes={values.notes[criterion.key]}
                  onScoreChange={(value) => setScore(criterion.key, value)}
                  onNotesChange={(value) => setNote(criterion.key, value)}
                />
              ))}
            </div>
          </FormSection>
        );
      })}

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
              value={values.recommendation}
              onChange={(event) =>
                setValues((previous) => ({ ...previous, recommendation: event.target.value }))
              }
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
            value={values.finalNotes}
            onChange={(event) =>
              setValues((previous) => ({ ...previous, finalNotes: event.target.value }))
            }
            placeholder="Anything the record should keep — strengths, doubts, follow-ups."
          />
        </Field>
      </FormSection>

      <FormError message={state.error} />
      <FormSuccess message={state.savedAt} />

      {restoredDraftAt && (
        <p className="rounded-lg bg-surface px-3 py-2 text-xs text-ieee-gray">
          Unsaved work from {formatClock(restoredDraftAt)} was restored from this browser.
        </p>
      )}

      {!liveComplete ? (
        <div className="rounded-xl border border-hairline bg-surface/60 p-3">
          <p className="text-xs font-bold tracking-widest text-ieee-blue uppercase">
            Still needed before Pass unlocks
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ieee-gray">
            {missing.map((item) => (
              <li key={item} className="inline-flex items-center gap-1.5">
                <Circle className="h-2.5 w-2.5 shrink-0 fill-current" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        !savedComplete && (
          <p className="rounded-lg bg-ieee-orange-dark/10 px-3 py-2 text-sm font-semibold text-ieee-orange-dark">
            Everything is filled in — save the evaluation to unlock Pass, Reject and Transfer.
          </p>
        )
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" formNoValidate variant="secondary" disabled={pending}>
          {pending ? 'Saving…' : 'Save draft'}
        </Button>
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? 'Saving…' : 'Save evaluation'}
        </Button>
        <p className="text-xs text-ieee-gray">
          {dirty
            ? `Unsaved changes are kept in this browser automatically${
                localDraftAt ? ` (last at ${formatClock(localDraftAt)})` : ''
              }.`
            : 'A draft may be saved at any point — the criteria are only required to finish the interview.'}
        </p>
      </div>
    </form>
  );
}

/** One numbered section of the form, with its running progress in the header. */
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

/** One scored line: the criterion's score box and its note. */
function CriterionRow({
  criterion,
  score,
  notes,
  onScoreChange,
  onNotesChange,
}: {
  criterion: EvaluationCriterion;
  score: string;
  notes: string;
  onScoreChange: (value: string) => void;
  onNotesChange: (value: string) => void;
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
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Notes (required to finish)"
          aria-label={`${criterion.label} notes`}
        />
      </div>
    </div>
  );
}
