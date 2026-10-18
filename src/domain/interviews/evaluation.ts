/**
 * The evaluation form — one global definition shared by every track.
 *
 * Five sections, 100 points in total. The recommendation is a separate
 * judgement and is never counted into the score; it lives in its own column
 * on the interview row.
 */

export const EVALUATION_SECTIONS = [
  { key: 'technical', label: 'Technical interview (CS/CIS knowledge)', max: 30 },
  { key: 'english', label: 'English communication', max: 20 },
  { key: 'teamwork', label: 'Teamwork & interpersonal skills', max: 20 },
  { key: 'commitment', label: 'Commitment & availability', max: 20 },
  { key: 'experience', label: 'Previous experience & projects', max: 10 },
] as const;

export type EvaluationSectionKey = (typeof EVALUATION_SECTIONS)[number]['key'];

/** Scores keyed by section; a complete form has every section present. */
export type EvaluationScores = Record<EvaluationSectionKey, number>;

/** The sum of every section's maximum — 100. */
export const EVALUATION_MAX_TOTAL = EVALUATION_SECTIONS.reduce(
  (sum, section) => sum + section.max,
  0,
);

export const RECOMMENDATIONS = ['STRONG_YES', 'YES', 'NO', 'STRONG_NO'] as const;
export type Recommendation = (typeof RECOMMENDATIONS)[number];

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  STRONG_YES: 'Strong yes',
  YES: 'Yes',
  NO: 'No',
  STRONG_NO: 'Strong no',
};

/** The evaluation as stored on one interview row. */
export interface InterviewEvaluation {
  /** Per-section scores; partial while the form is being filled in. */
  scores: Partial<EvaluationScores>;
  /** Sum of the saved section scores. */
  total: number;
  /** Null until the interviewer commits to a verdict. */
  recommendation: Recommendation | null;
  finalNotes: string | null;
  updatedAt: string | null;
}

/** Every section scored and a recommendation made — the gate for finishing. */
export function isEvaluationComplete(evaluation: InterviewEvaluation | null): boolean {
  if (!evaluation?.recommendation) return false;
  return EVALUATION_SECTIONS.every((section) => Number.isFinite(evaluation.scores[section.key]));
}
