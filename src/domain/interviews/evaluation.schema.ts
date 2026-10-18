import { z } from 'zod';
import {
  EVALUATION_CRITERIA,
  EVALUATION_DATA_FIELDS,
  RECOMMENDATIONS,
  type CriterionScore,
  type EvaluationCriterionKey,
  type EvaluationDataKey,
} from './evaluation';

/**
 * One criterion: a score capped at the criterion's maximum, plus the note that
 * justifies it. Both are required — the same rule the database enforces in
 * `save_interview_evaluation`, so a valid form is always a complete one.
 */
function criterionSchema(max: number) {
  return z.object({
    score: z.preprocess(
      // An empty box must fail validation, not coerce into a silent 0.
      (value) => (value === '' || value === null || value === undefined ? undefined : value),
      z.coerce
        .number({ required_error: 'Enter a score.', invalid_type_error: 'Enter a score.' })
        .int('Scores are whole numbers.')
        .min(1, `Enter a score from 1 to ${max}.`)
        .max(max, `Enter a score from 1 to ${max}.`),
    ),
    notes: z.string({ required_error: 'Add a short note.' }).trim().min(1, 'Add a short note.'),
  });
}

const scoreFields = Object.fromEntries(
  EVALUATION_CRITERIA.map((criterion) => [criterion.key, criterionSchema(criterion.max)]),
) as unknown as Record<EvaluationCriterionKey, z.ZodType<CriterionScore>>;

const dataFields = Object.fromEntries(
  EVALUATION_DATA_FIELDS.map((field) => [field.key, z.string().trim().min(1, 'Required.')]),
) as unknown as Record<EvaluationDataKey, z.ZodString>;

export const evaluationDataSchema = z.object(dataFields);
export const evaluationScoresSchema = z.object(scoreFields);

export const evaluationInputSchema = z.object({
  interviewId: z.string().uuid(),
  data: evaluationDataSchema,
  scores: evaluationScoresSchema,
  recommendation: z.enum(RECOMMENDATIONS, {
    errorMap: () => ({ message: 'Choose a recommendation.' }),
  }),
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
 * (rather than becoming `""` or a coerced `0`) so the schema can point at the
 * criterion that still needs a score or a note.
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
