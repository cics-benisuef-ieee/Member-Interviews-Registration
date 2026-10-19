import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function RegisterThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string; track?: string }>;
}) {
  const { n, track } = await searchParams;

  if (!n || !track) redirect('/register');

  return (
    <div className="rounded-xl border border-hairline bg-gradient-surface p-6 text-center shadow-card sm:p-8">
      <p className="text-xs font-bold tracking-widest text-ieee-blue uppercase">
        You’re registered
      </p>
      <p className="mt-4 bg-gradient-blue bg-clip-text text-5xl font-bold text-transparent">#{n}</p>
      <p className="mt-4 text-lg font-semibold text-ieee-navy">{track}</p>
      <p className="mt-2 text-sm text-ieee-gray">
        Please be at the interview area before your number is called. Keep this page available in
        case you need to check your number again.
      </p>
      <Link
        href="/register"
        className="mt-6 inline-block rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-ieee-gray hover:border-ieee-blue hover:text-ieee-blue"
      >
        Register another member
      </Link>
      <Link
        href="/results"
        className="mt-3 block text-sm font-semibold text-ieee-blue hover:underline"
      >
        Check your result after the interview
      </Link>
    </div>
  );
}
