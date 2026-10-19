import Link from 'next/link';
import { RegisterForm } from '@/components/features/registration/RegisterForm';
import { listRegistrationTracks } from '@/domain/tracks/track.service';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const tracks = await listRegistrationTracks();

  return (
    <div className="rounded-xl border border-hairline bg-gradient-surface p-6 shadow-card sm:p-8">
      <h1 className="text-2xl font-bold text-ieee-navy">Register for an interview</h1>
      <p className="mb-6 mt-1 text-sm text-ieee-gray">
        Fill in your details and you’ll receive a queue number for your track today.
      </p>
      <RegisterForm tracks={tracks} />

      <p className="mt-6 border-t border-hairline pt-4 text-center text-sm text-ieee-gray">
        Already registered?{' '}
        <Link href="/results" className="font-semibold text-ieee-blue hover:underline">
          Check your interview result
        </Link>
      </p>
    </div>
  );
}
