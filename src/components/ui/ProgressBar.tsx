import { cn } from '@/lib/utils';

type ProgressTone = 'blue' | 'green' | 'orange';

const TONE_FILL: Record<ProgressTone, string> = {
  blue: 'bg-ieee-blue',
  green: 'bg-ieee-green-dark',
  orange: 'bg-ieee-orange-dark',
};

interface ProgressBarProps {
  value: number;
  max: number;
  tone?: ProgressTone;
  /** Describes what is being measured, for screen readers. */
  label: string;
  className?: string;
}

/** A slim progress meter — e.g. "how much of today's queue is done". */
export function ProgressBar({
  value,
  max,
  tone = 'blue',
  label,
  className,
}: ProgressBarProps) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-hairline', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', TONE_FILL[tone])}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
