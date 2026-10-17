import { LoginForm } from '@/components/features/auth/LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="rounded-xl border border-hairline bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-ieee-navy">Sign in</h1>
      <p className="mb-6 mt-1 text-sm text-ieee-gray">
        Track boards and chapter admins — sign in with your chapter account.
      </p>
      <LoginForm next={next} />
    </div>
  );
}
