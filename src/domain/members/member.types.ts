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
