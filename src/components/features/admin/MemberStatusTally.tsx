import { Badge } from '@/components/ui/Badge';
import type { MemberDayStatus, MemberWithStatus } from '@/domain/members/member.types';
import { DAY_STATUS_ORDER, dayStatusLabel, dayStatusTone } from './members.format';

/**
 * A one-glance tally of where the listed members stand.
 *
 * It is deliberately scoped to the rows beside it — the list is capped and
 * searchable, so the tally answers "what am I looking at?" rather than
 * pretending to be a total for the whole event.
 */
export function MemberStatusTally({ members }: { members: MemberWithStatus[] }) {
  const tally = new Map<MemberDayStatus, number>();
  for (const member of members) {
    if (!member.dayStatus) continue;
    tally.set(member.dayStatus, (tally.get(member.dayStatus) ?? 0) + 1);
  }

  if (tally.size === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {DAY_STATUS_ORDER.filter((status) => tally.has(status)).map((status) => (
        <Badge key={status} tone={dayStatusTone(status)}>
          {tally.get(status)} {dayStatusLabel(status).toLowerCase()}
        </Badge>
      ))}
    </div>
  );
}
