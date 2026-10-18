import { buttonClasses } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Compass } from 'lucide-react';
import Link from 'next/link';

/** Reached for any unknown URL, and for a track that no longer exists. */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-6">
      <div className="w-full max-w-md">
        <EmptyState
          icon={<Compass className="h-6 w-6" />}
          title="Page not found"
          hint="That page does not exist, or the track you followed has been removed."
          action={
            <Link href="/" className={buttonClasses('primary')}>
              Go to the home page
            </Link>
          }
        />
      </div>
    </div>
  );
}
