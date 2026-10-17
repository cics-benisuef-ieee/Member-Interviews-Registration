import type { BadgeTone } from '@/components/ui/Badge';
import type { InterviewStatus } from '@/domain/interviews/interview.constants';

/** Human-readable label for every interview status. */
export function statusLabel(status: InterviewStatus): string {
  const labels: Record<InterviewStatus, string> = {
    WAITING: 'Waiting',
    IN_INTERVIEW: 'In interview',
    PASSED: 'Passed',
    REJECTED: 'Rejected',
    NEEDS_ANOTHER_TRACK: 'Sent to another track',
  };
  return labels[status];
}

/** Badge color for every interview status. */
export function statusTone(status: InterviewStatus): BadgeTone {
  const tones: Record<InterviewStatus, BadgeTone> = {
    WAITING: 'waiting',
    IN_INTERVIEW: 'active',
    PASSED: 'passed',
    REJECTED: 'rejected',
    NEEDS_ANOTHER_TRACK: 'transferred',
  };
  return tones[status];
}

/** Formats a queue number as shown on badges and rows. */
export function formatQueueNumber(queueNumber: number): string {
  return `#${queueNumber}`;
}

/** Formats an ISO timestamp as local time (e.g. "14:35"), or "—". */
export function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
