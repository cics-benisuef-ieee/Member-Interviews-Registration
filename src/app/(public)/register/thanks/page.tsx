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
    <div className="rounded-xl border border-hairline bg-white p-8 text-center shadow-sm">
      <p className="text-xs font-bold tracking-widest text-ieee-blue uppercase">
        You’re registered
      </p>
      <p className="mt-4 text-5xl font-bold text-ieee-navy">#{n}</p>
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
    </div>
  );
}
