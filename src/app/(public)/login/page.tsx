import Image from 'next/image';
import Link from 'next/link';
import { LoginForm } from '@/components/features/auth/LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="mx-auto max-w-[30rem]">
      <div className="mb-6 text-center">
        <Image
          src="/logo.png"
          alt="CS/CIS Beni-Suef Chapter logo"
          width={64}
          height={64}
          priority
          className="mx-auto mb-3.5 h-16 w-16 rounded-full bg-white object-cover shadow-card ring-1 ring-hairline"
        />
        <h1 className="text-2xl font-bold tracking-tight text-ieee-navy">Sign in</h1>
        <p className="mt-1 text-sm text-ieee-gray">
          Sign in with your CS/CIS Beni-Suef Chapter account.
        </p>
      </div>

      <div className="rounded-xl border border-hairline bg-gradient-surface p-6 shadow-card sm:p-8">
        <LoginForm next={next} />

        <p className="mt-4 text-center text-sm text-ieee-gray">
          New member?{' '}
          <Link href="/register" className="font-semibold text-ieee-blue hover:underline">
            Register for an interview
          </Link>
        </p>
      </div>

      <p className="mt-4 text-center text-xs text-ieee-gray">
        Board and admin accounts are created and managed by a chapter administrator.
      </p>
    </div>
  );
}
