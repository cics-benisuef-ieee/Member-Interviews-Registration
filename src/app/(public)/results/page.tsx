import { ResultLookupForm } from '@/components/features/results/ResultLookupForm';

export const dynamic = 'force-dynamic';

export default function ResultsPage() {
  return (
    <div className="rounded-xl border border-hairline bg-gradient-surface p-6 shadow-card sm:p-8">
      <h1 className="text-2xl font-bold text-ieee-navy">Interview results</h1>
      <p className="mb-6 mt-1 text-sm text-ieee-gray">
        Already registered and interviewed? Enter the email address and phone number you registered
        with to see your result.
      </p>
      <ResultLookupForm />
    </div>
  );
}
