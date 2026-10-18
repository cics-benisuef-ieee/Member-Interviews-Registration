import type { BadgeTone } from '@/components/ui/Badge';
import type { MemberDayStatus } from '@/domain/members/member.types';

/** Human-readable label for every member day status. */
export function dayStatusLabel(status: MemberDayStatus): string {
  const labels: Record<MemberDayStatus, string> = {
    interviewing: 'Interviewing',
    pending: 'Pending',
    accepted: 'Accepted',
    rejected: 'Rejected',
  };
  return labels[status];
}

/**
 * Badge color for every member day status. The tones reuse the queue's chips
 * so a member's row and the board always tell the same color story.
 */
export function dayStatusTone(status: MemberDayStatus): BadgeTone {
  const tones: Record<MemberDayStatus, BadgeTone> = {
    interviewing: 'active',
    pending: 'waiting',
    accepted: 'passed',
    rejected: 'rejected',
  };
  return tones[status];
}

/** The order the list header tallies statuses in: live first, outcomes last. */
export const DAY_STATUS_ORDER: MemberDayStatus[] = [
  'interviewing',
  'pending',
  'accepted',
  'rejected',
];
