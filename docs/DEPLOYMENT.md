# Deployment

Everything runs on free tiers: Supabase (database + auth) and Vercel (hosting).

## 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com) (choose a region near your chapter).
2. **SQL Editor → New query**: run each file in `supabase/migrations/` in order (`0001` … `0005`). Each should report `Success`.
3. **Project Settings → API Keys**: create the **publishable and secret API keys** (the legacy `anon` / `service_role` keys are being retired by end of 2026). Copy the project URL, the publishable key, and a secret key — give the secret key a name like `seed-and-admin` so it can be rotated independently.
4. On your machine, fill `.env` with those values, then run `npm run db:seed`.
5. Copy the printed credentials somewhere safe — the admin login and one login per track.

## 2. Vercel

1. Push the repository to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new) (framework auto-detected: Next.js).
3. Add the environment variables from `.env.example` (with your real Supabase values and the production URL):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - `NEXT_PUBLIC_SITE_URL` (the Vercel domain)
   - `TRACK_EMAIL_DOMAIN`, `TRACK_DEFAULT_PASSWORD`
4. Deploy. Every push to `main` redeploys automatically.

> If you are still on the legacy keys, the app also accepts `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` — but migrate before Supabase retires them at the end of 2026.

## 3. Supabase Auth settings

In **Authentication → URL Configuration**, add the production site URL so sign-in redirects work. No email delivery is needed — account emails are just login names, confirmed by the seed script.

## Free-tier notes

- A Supabase free project **pauses after ~1 week of no activity**. Opening the project in the dashboard resumes it. Continuous real use keeps it awake.
- Vercel Hobby is for non-commercial use — fine for a chapter/volunteer tool.
- Database backups on the free tier are weekly; export manually from the dashboard before big event days.

## Changing the queue timezone

The queue day comes from the `app_settings` row `queue_timezone` (an IANA name like `Africa/Cairo`). Change it with:

```sql
update app_settings set value = 'your/timezone' where key = 'queue_timezone';
```

The change applies immediately — no redeploy needed.
