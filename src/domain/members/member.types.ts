import type { Recommendation } from '@/domain/interviews/evaluation';
import type { InterviewStatus } from '@/domain/interviews/interview.constants';

export interface Member {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  /** Free-form role detail (e.g. "Year 3 · CS"); optional. */
  position: string | null;
}

/** A member with the interviews they have had, newest day first. */
export interface MemberWithInterviews extends Member {
  interviews: MemberInterviewSummary[];
}

export interface MemberInterviewSummary {
  id: string;
  queueDay: string;
  queueNumber: number;
  status: string;
  trackName: string;
}

/**
 * Where a member stands in today's queue, in the words an admin scans for.
 *
 * The database's vocabulary is per interview (WAITING, PASSED, …) and one
 * member can hold several entries in a day — a transfer leaves the original
 * row behind and adds one in the target track — so this is a separate,
 * per-member summary rather than a raw status.
 */
export type MemberDayStatus = 'interviewing' | 'pending' | 'accepted' | 'rejected';

/** One of a member's queue entries for today, as the expandable row shows it. */
export interface MemberTodayInterview {
  id: string;
  queueNumber: number;
  status: InterviewStatus;
  /** The track this entry belongs to — the member's current stop if transferred. */
  trackName: string;
  startedAt: string | null;
  finishedAt: string | null;
  /** Null on the entry the member registered into; set on entries a transfer created. */
  transferredFromId: string | null;
  overallTotal: number | null;
  recommendation: Recommendation | null;
  /** Accounts that worked on this interview today, in order of first action. */
  interviewers: string[];
}

/** A member as the admin list shows them: today's queue state alongside. */
export interface MemberWithStatus extends Member {
  /** Null when the member has no queue entry for today (registered on an earlier day). */
  dayStatus: MemberDayStatus | null;
  /** Today's entries, ordered by queue number. */
  todayInterviews: MemberTodayInterview[];
  /** The track the member registered into today; null when not queued today. */
  registeredTrackName: string | null;
  /** The track holding the member now — equals registeredTrackName unless transferred. */
  currentTrackName: string | null;
}
