import { z } from 'zod';
import {
  EVALUATION_CRITERIA,
  EVALUATION_DATA_FIELDS,
  RECOMMENDATIONS,
  type CriterionDraft,
  type EvaluationCriterionKey,
  type EvaluationDataKey,
} from './evaluation';

/**
 * One criterion of a draft: a score capped at the criterion's maximum plus
 * the note that justifies it — both optional, so a half-filled form can be
 * saved instead of being lost. What *is* provided must still be valid: an
 * empty box stays empty (rather than coercing into a silent 0), and a note
 * trimmed to nothing is treated as "not written yet".
 *
 * The completeness rule itself lives in the database (`complete_interview`)
 * and in `isDraftComplete`, so a draft can never slip past the gate that keeps
 * Pass, Reject and Transfer locked.
 */
function criterionDraftSchema(max: number) {
  return z.object({
    score: z.preprocess(
      // An empty box must fail validation, not coerce into a silent 0.
      (value) => (value === '' || value === null || value === undefined ? undefined : value),
      z.coerce
        .number({ required_error: 'Enter a score.', invalid_type_error: 'Enter a score.' })
        .int('Scores are whole numbers.')
        .min(1, `Enter a score from 1 to ${max}.`)
        .max(max, `Enter a score from 1 to ${max}.`)
        .optional(),
    ),
    notes: z
      .string({ required_error: 'Add a short note.' })
      .trim()
      .max(2000, 'That note is too long.')
      .optional()
      .transform((value) => value || undefined),
  });
}

const scoreFields = Object.fromEntries(
  EVALUATION_CRITERIA.map((criterion) => [criterion.key, criterionDraftSchema(criterion.max)]),
) as unknown as Record<EvaluationCriterionKey, z.ZodType<CriterionDraft>>;

const dataFields = Object.fromEntries(
  EVALUATION_DATA_FIELDS.map((field) => [
    field.key,
    z.preprocess(
      (value) => (typeof value === 'string' ? value : ''),
      z.string().trim().max(200, 'That name is too long.'),
    ),
  ]),
) as unknown as Record<EvaluationDataKey, z.ZodString>;

export const evaluationDataSchema = z.object(dataFields);
export const evaluationScoresSchema = z.object(scoreFields);

/**
 * The whole form as it is submitted — a finished evaluation or a draft of it.
 * Nothing here demands completeness: the database decides what a *stored*
 * evaluation means (a draft leaves `overall_total` null, and finishing an
 * interview without a total is refused), so saving early is always safe.
 */
export const evaluationInputSchema = z.object({
  interviewId: z.string().uuid(),
  data: evaluationDataSchema,
  scores: evaluationScoresSchema,
  recommendation: z.enum(RECOMMENDATIONS).optional(),
  finalNotes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((value) => value || undefined),
});

export type EvaluationInput = z.infer<typeof evaluationInputSchema>;

/** Builds the "score_<criterion>" form-data keys the evaluation form submits. */
export function scoreFieldName(key: EvaluationCriterionKey): string {
  return `score_${key}`;
}

/** Builds the "notes_<criterion>" form-data keys the evaluation form submits. */
export function notesFieldName(key: EvaluationCriterionKey): string {
  return `notes_${key}`;
}

/**
 * Reads the submitted evaluation back out of a form. Empty boxes stay empty
 * (rather than becoming `""` or a coerced `0`) so the schema can tell a
 * filled-in criterion from one the committee has not reached yet.
 */
export function evaluationFromFormData(formData: FormData): {
  data: Record<string, unknown>;
  scores: Record<string, unknown>;
} {
  return {
    data: Object.fromEntries(
      EVALUATION_DATA_FIELDS.map((field) => [field.key, formData.get(field.key) ?? '']),
    ),
    scores: Object.fromEntries(
      EVALUATION_CRITERIA.map((criterion) => [
        criterion.key,
        {
          score: formData.get(scoreFieldName(criterion.key)),
          notes: formData.get(notesFieldName(criterion.key)) ?? '',
        },
      ]),
    ),
  };
}
