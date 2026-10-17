import { RegisterForm } from '@/components/features/registration/RegisterForm';
import { listRegistrationTracks } from '@/domain/tracks/track.service';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const tracks = await listRegistrationTracks();

  return (
    <div className="rounded-xl border border-hairline bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-ieee-navy">Register for an interview</h1>
      <p className="mb-6 mt-1 text-sm text-ieee-gray">
        Fill in your details and you’ll receive a queue number for your track today.
      </p>
      <RegisterForm tracks={tracks} />
    </div>
  );
}
