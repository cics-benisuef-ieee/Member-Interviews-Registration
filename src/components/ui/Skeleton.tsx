import { cn } from '@/lib/utils';

/**
 * A neutral placeholder for content that has not arrived yet.
 *
 * Used by the route-level `loading.tsx` files so a slow query produces a
 * layout-shaped page instead of a blank screen or a spinner in the middle of
 * nowhere.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-lg bg-hairline/80', className)} />;
}

/** A stand-in for a paragraph of text. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={cn('h-3.5', index === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

/** A stand-in for a card, matching the real card's corner radius and padding. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-hairline bg-white p-5 shadow-card', className)}>
      <Skeleton className="h-4 w-1/3" />
      <SkeletonText className="mt-4" lines={2} />
    </div>
  );
}
