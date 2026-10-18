import { z } from 'zod';
import { EVALUATION_SECTIONS, RECOMMENDATIONS, type EvaluationSectionKey } from './evaluation';

/**
 * One score per section, each capped at the section's maximum. Because the
 * maximums add up to 100, a valid form can never total more than 100 — the
 * same rule the database enforces on the stored total.
 */
function sectionScore(max: number) {
  return z.coerce
    .number({ invalid_type_error: 'Enter a score.' })
    .int('Scores are whole numbers.')
    .min(0, 'A score cannot be negative.')
    .max(max, `This section is out of ${max}.`);
}

const scoreFields = Object.fromEntries(
  EVALUATION_SECTIONS.map((section) => [section.key, sectionScore(section.max)]),
) as Record<EvaluationSectionKey, z.ZodNumber>;

export const evaluationScoresSchema = z.object(scoreFields);

export const evaluationInputSchema = z.object({
  interviewId: z.string().uuid(),
  scores: evaluationScoresSchema,
  recommendation: z.enum(RECOMMENDATIONS, {
    errorMap: () => ({ message: 'Choose a recommendation.' }),
  }),
  finalNotes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((value) => value || undefined),
});

export type EvaluationInput = z.infer<typeof evaluationInputSchema>;

/** Builds the "score_<section>" form-data keys the evaluation form submits. */
export function scoreFieldName(key: EvaluationSectionKey): string {
  return `score_${key}`;
}

/**
 * Reads the submitted scores back out of a form, keyed by section. An empty
 * box becomes `undefined` (not `""`, which zod's coercion would turn into a
 * silent 0) so a blank section fails validation instead of saving as zero.
 */
export function scoresFromFormData(formData: FormData): Record<string, unknown> {
  return Object.fromEntries(
    EVALUATION_SECTIONS.map((section) => {
      const value = formData.get(scoreFieldName(section.key));
      return [section.key, value === null || value === '' ? undefined : value];
    }),
  );
}
