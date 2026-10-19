import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/** Accent colors for a stat's icon chip. Dark palette on white, per the brand rule. */
export type StatTone = 'navy' | 'blue' | 'orange' | 'green' | 'red' | 'gray';

const TONE_CHIP: Record<StatTone, string> = {
  navy: 'bg-gradient-navy-soft text-white shadow-sm',
  blue: 'bg-gradient-blue text-white shadow-sm',
  orange: 'bg-gradient-orange text-white shadow-sm',
  green: 'bg-gradient-green text-white shadow-sm',
  red: 'bg-gradient-red text-white shadow-sm',
  gray: 'bg-hairline text-ieee-gray',
};

interface StatCardProps {
  label: string;
  /** Rendered large — keep it short (a number, or a short word). */
  value: ReactNode;
  hint?: ReactNode;
  tone?: StatTone;
  icon?: ReactNode;
  className?: string;
}

/** A single headline figure. The workhorse of the admin overview. */
export function StatCard({ label, value, hint, tone = 'navy', icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-hairline bg-gradient-surface p-5 shadow-card transition-shadow hover:shadow-raised',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-ieee-gray">{label}</p>
        {icon && (
          <span
            aria-hidden
            className={cn(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              TONE_CHIP[tone],
            )}
          >
            {icon}
          </span>
        )}
      </div>

      <p className="mt-3 text-3xl font-bold tracking-tight text-ieee-navy">{value}</p>
      {hint && <p className="mt-1 text-sm text-ieee-gray">{hint}</p>}
    </div>
  );
}
