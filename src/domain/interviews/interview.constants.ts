/**
 * Interview lifecycle — the single source of truth for allowed state
 * transitions. Adding a status means adding an entry here, not editing
 * scattered conditionals.
 */

export const INTERVIEW_STATUSES = [
  'WAITING',
  'IN_INTERVIEW',
  'PASSED',
  'REJECTED',
  'NEEDS_ANOTHER_TRACK',
] as const;

export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export const STATUS_TRANSITIONS: Record<InterviewStatus, readonly InterviewStatus[]> = {
  WAITING: ['IN_INTERVIEW'],
  // Unstart puts a member back in the waiting queue; the evaluation saved so
  // far (and their queue number) is preserved.
  IN_INTERVIEW: ['WAITING', 'PASSED', 'REJECTED', 'NEEDS_ANOTHER_TRACK'],
  // A finished interview stays editable (0009): its decision may be swapped,
  // or it may be reopened back into the queue.
  PASSED: ['REJECTED', 'WAITING'],
  REJECTED: ['PASSED', 'WAITING'],
  NEEDS_ANOTHER_TRACK: ['WAITING'],
};

/** Outcomes a board can record when finishing an interview. */
export const INTERVIEW_OUTCOMES = ['PASSED', 'REJECTED', 'TRANSFER'] as const;
export type InterviewOutcome = (typeof INTERVIEW_OUTCOMES)[number];

export const ACTIVE_STATUSES: readonly InterviewStatus[] = ['WAITING', 'IN_INTERVIEW'];

export const FINISHED_STATUSES: readonly InterviewStatus[] = [
  'PASSED',
  'REJECTED',
  'NEEDS_ANOTHER_TRACK',
];

export function canTransition(from: InterviewStatus, to: InterviewStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

export function isFinished(status: InterviewStatus): boolean {
  return FINISHED_STATUSES.includes(status);
}

/** Looser variant for raw database values that are typed as plain `string`. */
export function isFinishedStatus(status: string): boolean {
  return FINISHED_STATUSES.includes(status as InterviewStatus);
}
