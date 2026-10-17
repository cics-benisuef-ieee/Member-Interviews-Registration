import type { InterviewStatus } from './interview.constants';

/** One line in a track's queue: the interview plus its member. */
export interface QueueEntry {
  id: string;
  queueNumber: number;
  status: InterviewStatus;
  startedAt: string | null;
  finishedAt: string | null;
  notes: string | null;
  transferredFromId: string | null;
  /** Present on transferred-in entries: the track the member came from. */
  sourceTrackName?: string;
  member: {
    id: string;
    fullName: string;
    phone: string | null;
  };
}

/** Everything one track's board shows for a given day. */
export interface TrackBoard {
  trackId: string;
  trackName: string;
  day: string;
  nowServing: QueueEntry | null;
  waiting: QueueEntry[];
  finished: QueueEntry[];
}

/** One card on the admin overview: a track's activity today. */
export interface TrackDaySummary {
  trackId: string;
  trackName: string;
  waitingCount: number;
  finishedCount: number;
  nowServingName: string | null;
}

/** A completed/recorded interview for history views. */
export interface InterviewHistoryEntry {
  id: string;
  queueDay: string;
  queueNumber: number;
  status: InterviewStatus;
  startedAt: string | null;
  finishedAt: string | null;
  trackName: string;
  memberName: string;
  transferredToTrackName: string | null;
}

export interface RegistrationReceipt {
  interviewId: string;
  queueNumber: number;
  trackName: string;
}
