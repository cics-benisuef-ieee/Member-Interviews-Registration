import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Removes the default padding, e.g. for tables that fill the card. */
  flush?: boolean;
}

export function Card({ flush = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-hairline bg-white shadow-sm',
        !flush && 'p-5',
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold text-ieee-navy', className)} {...props} />;
}

export function CardSubtitle({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-1 text-sm text-ieee-gray', className)} {...props} />;
}
