# AGENTS.md

Interview queue for an IEEE chapter: public registration → per-track daily queues → track boards run interviews with evaluations → admin panel. Next.js 15 (App Router) + React 19 + TypeScript + Tailwind + Zod, Supabase (Postgres + Auth + RLS), Vercel. One app, no monorepo.

## Organization (keep this)

- One responsibility per file; split rather than grow. Copy the granularity of `src/domain/interviews/` (service / repo / schema / types / constants) and `src/components/features/<area>/`. A file drifting toward two concerns should become two files.
- Layers: `app → actions → domain → repos → Supabase`. Components never touch the database; business rules never live in components.
- `README.md` has the directory map and setup; `docs/` has the database, workflow, security, and deployment references. Link to them instead of restating.

## Verify

- **No test runner and no typecheck script exist.** Run `npm run lint && npx tsc --noEmit`, then `npm run build` (needs `.env`).
- `npm run db:test-evaluation` is the only automated test — it compiles the domain layer and writes a scratch `@itest.local` member to your live Supabase, then removes it.
- `db:*` scripts run via `node --env-file=.env` against a live Supabase with the secret key (bypass RLS). `db:seed` / `db:demo` are idempotent; **`db:clear` deletes all members and interviews**; **`db:types` overwrites the hand-written `src/types/database.ts`** that `domain/*/*.repo.ts` import — don't run it casually.

## Gotchas

- `src/middleware.ts` must live under `src/`; a root-level copy is silently ignored.
- Server actions return `{ error }` via `actionFailed` instead of throwing — throwing replaces the live board with the error boundary mid-interview.
- The queue renders on `/board`, `/board/history`, `/admin/tracks/[trackId]`, `/admin/members`, `/admin/history` and `/tv`; call `revalidateQueueViews()` after any change.
- Migrations are applied by hand in the Supabase SQL editor in numeric order: `0001`–`0004` are one-shot; `0005`+ are `create or replace` and safe to re-run. Interview writes go through security-definer DB functions, never direct table writes.
- `createAdminClient()` bypasses RLS (secret key) — credential management only; user-facing data uses `createClient()` (publishable key + RLS).
- Import alias `@/*` → `src/*`. `build/` is gitignored scratch output from the test compile.
