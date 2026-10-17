import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

/**
 * Badge tones map directly to the interview lifecycle. Colors follow the
 * IEEE rule: dark palette colors on white cards.
 */
export type BadgeTone = 'waiting' | 'active' | 'passed' | 'rejected' | 'transferred' | 'neutral';

const TONE_CLASSES: Record<BadgeTone, string> = {
  waiting: 'bg-ieee-gold text-ieee-navy',
  active: 'bg-ieee-orange-dark text-white',
  passed: 'bg-ieee-green-dark text-white',
  rejected: 'bg-ieee-red-dark text-white',
  transferred: 'bg-ieee-cyan text-ieee-navy',
  neutral: 'bg-hairline text-ieee-gray',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  );
}
