import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface SectionHeadingProps {
  title: string;
  /** A count chip rendered next to the title, e.g. how many rows follow. */
  count?: ReactNode;
  /** Right-aligned slot for a button or link. */
  action?: ReactNode;
  className?: string;
}

/** A small heading used to label a block inside a page (not the page itself). */
export function SectionHeading({ title, count, action, className }: SectionHeadingProps) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="truncate text-base font-bold tracking-tight text-ieee-navy">{title}</h2>
        {count !== undefined && <Badge tone="neutral">{count}</Badge>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
