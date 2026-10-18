import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  /** A lucide icon, rendered small inside a soft circle. */
  icon: ReactNode;
  title: string;
  /** One short sentence explaining when content will appear here. */
  hint?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * The "nothing here" state. A dashed card rather than bare text, so an empty
 * list still looks like a deliberate part of the layout instead of an error.
 */
export function EmptyState({ icon, title, hint, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-hairline bg-white px-6 py-14 text-center',
        className,
      )}
    >
      <span
        aria-hidden
        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ieee-gray"
      >
        {icon}
      </span>
      <p className="mt-4 font-semibold text-ieee-navy">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-ieee-gray">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
