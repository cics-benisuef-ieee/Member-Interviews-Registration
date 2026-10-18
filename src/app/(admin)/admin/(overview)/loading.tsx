import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';

/**
 * Generic placeholder for any admin page whose own loading state does not apply
 * (tracks, history). Kept deliberately neutral so it never promises a layout
 * the page does not have.
 */
export default function AdminLoading() {
  return (
    <div className="animate-fade-rise space-y-6">
      <div>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <SkeletonCard key={index} className="h-40" />
        ))}
      </div>
    </div>
  );
}
