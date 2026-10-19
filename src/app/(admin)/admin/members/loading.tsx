import { Skeleton } from '@/components/ui/Skeleton';

/** Shown while the member search and register form load. */
export default function MembersLoading() {
  return (
    <div className="animate-fade-rise space-y-6">
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>

      {/* Mirrors the real layout's order: search, register form, then the list. */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1">
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>

        <div className="lg:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-1">
          <div className="rounded-xl border border-hairline bg-white p-5 shadow-card">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-2 h-3.5 w-52" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-11 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2 lg:col-start-1 lg:row-start-2">
          <div className="rounded-xl border border-hairline bg-white shadow-card">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="border-b border-hairline px-5 py-4 last:border-b-0">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-2 h-3.5 w-56" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
