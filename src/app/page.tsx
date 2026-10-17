import { redirect } from 'next/navigation';
import { homePathFor } from '@/domain/auth/auth.types';
import { getSessionUser } from '@/domain/auth/session';

/** Landing page — sends people to the screen that fits them. */
export default async function HomePage() {
  const user = await getSessionUser();

  if (!user) redirect('/register');
  redirect(homePathFor(user));
}
