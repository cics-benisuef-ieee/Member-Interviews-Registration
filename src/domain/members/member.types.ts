export interface Member {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
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

/** A member as the admin list shows them: today's queue state alongside. */
export interface MemberWithStatus extends Member {
  /** Null when the member has no queue entry for today (registered on an earlier day). */
  dayStatus: MemberDayStatus | null;
}
