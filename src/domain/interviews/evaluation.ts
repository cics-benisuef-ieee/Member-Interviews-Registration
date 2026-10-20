/**
 * The evaluation form — one global definition shared by every track.
 *
 * Three scored sections (Attitude 50 + Technical Skills 40 + IEEE Knowledge 10
 * = 100 points) plus two unscored ones: the Data section (who interviewed the
 * member) and the Final evaluation (the computed total, a recommendation that
 * is never counted into the score, and optional notes).
 *
 * Every criterion carries a score, and may carry a note. The score is what a
 * complete evaluation needs (plus both interviewer fields and a
 * recommendation), which is the gate for finishing an interview; notes are
 * context the committee writes when it has something worth writing.
 */

/** The two free-text fields the committee fills before scoring. */
export const EVALUATION_DATA_FIELDS = [
  { key: 'interviewerTechnical', label: 'Interviewer Technical' },
  { key: 'interviewerAttitude', label: 'Interviewer Attitude' },
] as const;

export type EvaluationDataKey = (typeof EVALUATION_DATA_FIELDS)[number]['key'];

const ATTITUDE_CRITERIA = [
  { key: 'motivation', label: 'Motivation & Enthusiasm', max: 10 },
  { key: 'teamwork', label: 'Teamwork & Collaboration', max: 10 },
  { key: 'commitment', label: 'Commitment & Discipline', max: 10 },
  { key: 'communication', label: 'Communication & Confidence', max: 10 },
  { key: 'flexibility', label: 'Flexibility & Feedback Acceptance', max: 10 },
] as const;

const TECHNICAL_CRITERIA = [
  { key: 'technicalKnowledge', label: 'Technical Knowledge', max: 10 },
  { key: 'analyticalThinking', label: 'Analytical Thinking', max: 10 },
  { key: 'projectsExperience', label: 'Projects / Experience', max: 10 },
  { key: 'practicalApplication', label: 'Practical Application', max: 10 },
] as const;

const IEEE_CRITERIA = [
  { key: 'ieeeGoals', label: 'Understanding IEEE Goals', max: 5 },
  { key: 'studentBranch', label: 'Knowledge of Student Branch', max: 5 },
] as const;

/** One scored line of the form: a label, a maximum, and an optional note. */
export type EvaluationCriterion =
  | (typeof ATTITUDE_CRITERIA)[number]
  | (typeof TECHNICAL_CRITERIA)[number]
  | (typeof IEEE_CRITERIA)[number];

export type EvaluationSectionKey = 'attitude' | 'technicalSkills' | 'ieeeKnowledge';
export type EvaluationCriterionKey = EvaluationCriterion['key'];

/** All eleven scored criteria, in form order. */
export const EVALUATION_CRITERIA: readonly EvaluationCriterion[] = [
  ...ATTITUDE_CRITERIA,
  ...TECHNICAL_CRITERIA,
  ...IEEE_CRITERIA,
];

export interface EvaluationSection {
  key: EvaluationSectionKey;
  label: string;
  criteria: readonly EvaluationCriterion[];
  /** Sum of its criteria's maximums — 50, 40 and 10. */
  max: number;
}

function criteriaTotal(criteria: readonly { max: number }[]): number {
  return criteria.reduce((sum, criterion) => sum + criterion.max, 0);
}

export const EVALUATION_SECTIONS: readonly EvaluationSection[] = [
  {
    key: 'attitude',
    label: 'Attitude',
    criteria: ATTITUDE_CRITERIA,
    max: criteriaTotal(ATTITUDE_CRITERIA),
  },
  {
    key: 'technicalSkills',
    label: 'Technical Skills',
    criteria: TECHNICAL_CRITERIA,
    max: criteriaTotal(TECHNICAL_CRITERIA),
  },
  {
    key: 'ieeeKnowledge',
    label: 'IEEE Knowledge',
    criteria: IEEE_CRITERIA,
    max: criteriaTotal(IEEE_CRITERIA),
  },
];

/** The sum of every criterion's maximum — 100. */
export const EVALUATION_MAX_TOTAL = criteriaTotal(EVALUATION_CRITERIA);

/** One criterion as scored: a number, and the note that explains it if written. */
export interface CriterionScore {
  score: number;
  notes: string;
}

/**
 * One criterion as a work in progress — the shape a *draft* is saved in. Any
 * mix is valid: only a score, only a note, or neither. A criterion makes the
 * evaluation complete once it has a score, which is the one half the form
 * insists on.
 */
export interface CriterionDraft {
  score?: number;
  notes?: string;
}

/** Scores keyed by criterion; a complete form has every criterion present. */
export type EvaluationScores = Record<EvaluationCriterionKey, CriterionScore>;

/** Scores keyed by criterion as they are while the form is being filled in. */
export type EvaluationDraftScores = Partial<Record<EvaluationCriterionKey, CriterionDraft>>;

/** The Data section: who ran the interview. */
export interface EvaluationData {
  interviewerTechnical: string;
  interviewerAttitude: string;
}

export const RECOMMENDATIONS = ['ACCEPTED', 'NEEDS_TRAINING', 'REJECTED'] as const;
export type Recommendation = (typeof RECOMMENDATIONS)[number];

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  ACCEPTED: 'Accepted',
  NEEDS_TRAINING: 'Needs training',
  REJECTED: 'Rejected',
};

/** The evaluation as stored on one interview row. */
export interface InterviewEvaluation {
  /** Data section; empty strings while the form is being filled in. */
  data: EvaluationData;
  /** Per-criterion scores; partial while the form is being filled in. */
  scores: EvaluationDraftScores;
  /** Sum of the saved criterion scores; null on the row until the form is complete. */
  total: number;
  /** Null until the interviewer commits to a verdict. */
  recommendation: Recommendation | null;
  finalNotes: string | null;
  updatedAt: string | null;
}

/**
 * The form's own view of an evaluation in progress: what has been typed, and
 * whether that is enough to finish the interview. Both the live form (where
 * the scores are raw strings) and the saved row are judged by this one rule.
 */
export interface EvaluationDraft {
  data: Record<EvaluationDataKey, string>;
  scores: EvaluationDraftScores;
  recommendation: Recommendation | null;
}

/**
 * Every criterion scored, both interviewer fields filled, and a
 * recommendation made — the gate for finishing an interview. Notes are not
 * part of the gate: a note is context the committee adds when it has some, so
 * an evaluation with only scores can still be finished. Kept in step with the
 * same rule the database enforces in `complete_interview`: a draft may be
 * missing anything, but finishing may not.
 */
export function isDraftComplete(draft: EvaluationDraft): boolean {
  if (!draft.recommendation) return false;
  if (!draft.data.interviewerTechnical.trim() || !draft.data.interviewerAttitude.trim()) {
    return false;
  }

  return EVALUATION_CRITERIA.every((criterion) => {
    const criterionScore = draft.scores[criterion.key];
    return criterionScore !== undefined && Number.isFinite(criterionScore.score);
  });
}

/** The same completeness rule, read from the saved evaluation on the row. */
export function isEvaluationComplete(evaluation: InterviewEvaluation | null): boolean {
  if (!evaluation) return false;

  return isDraftComplete({
    data: evaluation.data,
    scores: evaluation.scores,
    recommendation: evaluation.recommendation,
  });
}

/** A raw form score (a string) as a valid score, or undefined if empty/out of range. */
export function parseScore(value: string, max: number): number | undefined {
  const score = Number(value);
  return value.trim() !== '' && Number.isInteger(score) && score >= 1 && score <= max
    ? score
    : undefined;
}

/** The running total of whatever has been scored so far — a draft's total. */
export function scoresTotal(scores: EvaluationDraftScores): number {
  return EVALUATION_CRITERIA.reduce((sum, criterion) => {
    const score = scores[criterion.key]?.score;
    return sum + (Number.isFinite(score) ? (score as number) : 0);
  }, 0);
}

/** How much of one section is done: points scored, and criteria scored. */
export function sectionProgress(
  scores: EvaluationDraftScores,
  section: EvaluationSection,
): { points: number; done: number } {
  return section.criteria.reduce(
    (progress, criterion) => {
      const criterionScore = scores[criterion.key];
      const score = Number.isFinite(criterionScore?.score) ? (criterionScore?.score as number) : 0;
      const finished = Number.isFinite(criterionScore?.score);

      return {
        points: progress.points + score,
        done: progress.done + (finished ? 1 : 0),
      };
    },
    { points: 0, done: 0 },
  );
}

/**
 * What a draft still needs, in the words the form lists above its buttons —
 * the same requirements `isDraftComplete` checks, spelled out one by one.
 * Notes never appear here: they are optional throughout.
 */
export function missingRequirements(draft: EvaluationDraft): string[] {
  const missing: string[] = [];

  if (!draft.data.interviewerTechnical.trim()) missing.push('The technical interviewer’s name');
  if (!draft.data.interviewerAttitude.trim()) missing.push('The attitude interviewer’s name');

  const unscored = EVALUATION_CRITERIA.filter(
    (criterion) => !Number.isFinite(draft.scores[criterion.key]?.score),
  ).length;
  if (unscored > 0) {
    missing.push(`${unscored} ${unscored === 1 ? 'criterion' : 'criteria'} without a score`);
  }

  if (!draft.recommendation) missing.push('A recommendation');

  return missing;
}
