/**
 * The evaluation form — one global definition shared by every track.
 *
 * Three scored sections (Attitude 50 + Technical Skills 40 + IEEE Knowledge 10
 * = 100 points) plus two unscored ones: the Data section (who interviewed the
 * member) and the Final evaluation (the computed total, a recommendation that
 * is never counted into the score, and optional notes).
 *
 * Every criterion carries both a score and a note — one without the other is
 * not a complete evaluation, which is the gate for finishing an interview.
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

/** One scored line of the form: a label, a maximum, and a required note. */
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

/** One criterion as scored: a number and the note that justifies it. */
export interface CriterionScore {
  score: number;
  notes: string;
}

/** Scores keyed by criterion; a complete form has every criterion present. */
export type EvaluationScores = Record<EvaluationCriterionKey, CriterionScore>;
export type PartialEvaluationScores = Partial<EvaluationScores>;

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
  scores: PartialEvaluationScores;
  /** Sum of the saved criterion scores. */
  total: number;
  /** Null until the interviewer commits to a verdict. */
  recommendation: Recommendation | null;
  finalNotes: string | null;
  updatedAt: string | null;
}

/**
 * Every criterion scored with a note, both interviewer fields filled, and a
 * recommendation made — the gate for finishing an interview. Kept in step with
 * the same rule the database enforces in `save_interview_evaluation`.
 */
export function isEvaluationComplete(evaluation: InterviewEvaluation | null): boolean {
  if (!evaluation?.recommendation) return false;
  if (!evaluation.data.interviewerTechnical.trim() || !evaluation.data.interviewerAttitude.trim()) {
    return false;
  }

  return EVALUATION_CRITERIA.every((criterion) => {
    const criterionScore = evaluation.scores[criterion.key];
    return (
      criterionScore !== undefined &&
      Number.isFinite(criterionScore.score) &&
      criterionScore.notes.trim().length > 0
    );
  });
}
