import { Badge } from '@/components/ui/Badge';
import type { InterviewStatus } from '@/domain/interviews/interview.constants';
import { statusLabel, statusTone } from './queue.format';

/** Shows an interview status with its brand color. */
export function StatusBadge({ status }: { status: InterviewStatus }) {
  return <Badge tone={statusTone(status)}>{statusLabel(status)}</Badge>;
}
