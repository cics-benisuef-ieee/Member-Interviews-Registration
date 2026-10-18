# IEEE Chapter — Member Interviews

An interview queue system for an IEEE chapter: members register online and receive a queue number, each track (committee) signs in to its own board to run interviews, and any member can be sent to another track for a second interview the same day.

Built with **Next.js + Supabase + Vercel** — every service runs on a free tier.

## Features

- **Public registration** — members register themselves from any phone, pick their track from a dropdown, and get a queue number.
- **Per-track boards** — each track has one shared login; its board shows today's queue with a live "now interviewing" panel and one-tap **Start / Pass / Reject**.
- **Same-day transfer** — a board can send a member to another track; the member is appended to that track's queue for the rest of the day, and the original record is kept.
- **Admin panel** — one admin login manages tracks and their credentials, registers members on their behalf, edits member details, and reviews full history.
- **Daily queue** — queues reset every day at local midnight (chapter timezone); queue numbers are assigned atomically, so two simultaneous registrations can never collide.
- **IEEE brand palette** — IEEE master + Computer Society + Computational Intelligence colors.

## Tech stack

| Layer           | Choice                                          |
| --------------- | ----------------------------------------------- |
| Framework       | Next.js 15 (App Router) + React 19 + TypeScript |
| Database & auth | Supabase (Postgres + Auth + Row Level Security) |
| Styling         | Tailwind CSS (IEEE palette as design tokens)    |
| Validation      | Zod                                             |
| Hosting         | Vercel                                          |

## Tracks

Seeded A→Z: Agentic AI · Back-end Development · Data Analysis · Embedded Systems · Flutter · Front-end Development · Machine Learning · Mechanical Design · Network · Red-Team · UI/UX — all editable from the admin panel.

## Getting started

### 1. Create the Supabase project

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the files in `supabase/migrations/` in order (`0001` → `0005`).
3. Open **Project Settings → API Keys** and copy the project URL, the **publishable** key, and a **secret** key. Supabase is retiring the legacy `anon` / `service_role` keys, so create/use the publishable-and-secret pair.

### 2. Configure the environment

```bash
cp .env.example .env
```

Fill in the Supabase values. Set `TRACK_EMAIL_DOMAIN` to a domain your chapter controls (emails are just account names — nothing is ever sent).

### 3. Seed tracks and logins

```bash
npm install
npm run db:seed
```

The script prints one login per track plus the admin login, all sharing `TRACK_DEFAULT_PASSWORD`. **Change that password before sharing.**

The seed only sets a password when it _creates_ an account, so it never overwrites a password you changed later from the admin panel. That means editing `TRACK_DEFAULT_PASSWORD` after the first seed does nothing by itself — run `npm run db:passwords` to push the new value to every existing login.

To change **one** account instead of all of them:

```bash
npm run db:password -- red-team@your-domain            # generates a strong password, prints it
npm run db:password -- admin@your-domain 'Chosen1!'    # sets a specific password
npm run db:password -- red-team                        # the email domain is assumed
```

This works for any login, including the admin account (which has no password UI in the app). Track logins can also be reset from `/admin/tracks`, which generates a random password — but it cannot set a value you choose.

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000 — visitors land on the registration form.

## Scripts

| Script                        | Purpose                                           |
| ----------------------------- | ------------------------------------------------- |
| `npm run dev`                 | Development server                                |
| `npm run build` / `npm start` | Production build / serve                          |
| `npm run lint`                | ESLint                                            |
| `npm run format`              | Prettier                                          |
| `npm run db:seed`             | Seed tracks + logins (idempotent)                 |
| `npm run db:demo`             | Add realistic demo queue data (idempotent)        |
| `npm run db:clear`            | Empty all members + interviews (backs up first)   |
| `npm run db:types`            | Regenerate database types (requires Supabase CLI) |

## Roles

| Role        | Login                    | Can do                                                        |
| ----------- | ------------------------ | ------------------------------------------------------------- |
| Track board | `track-slug@your-domain` | See its own queue; start, pass, reject, transfer              |
| Admin       | `admin@your-domain`      | Everything: all queues, tracks, credentials, members, history |

## Project structure

```
src/
├── app/          # Routes only — thin pages that fetch and render
├── actions/      # Server actions: validate → authorize → call service
├── domain/       # Business logic: tracks, members, interviews, auth
│   └── interviews/  # state machine, queue rules, transfer logic
├── components/   # ui/ (dumb) · layout/ · features/ (per area)
├── lib/          # env, Supabase clients, middleware
└── types/        # database row shapes
supabase/
├── migrations/   # schema, RLS policies, atomic queue functions
└── seed.sql
```

**Dependency rule:** `app → actions → domain → repos → Supabase`. Business rules never live in components; components never touch the database.

## Security

- Row Level Security is enabled on every table: a track board can only read its own track's interviews; writes to queues only happen through database functions that check the caller's role.
- Queue numbering and transfers run as atomic Postgres functions — no race conditions, no lost members.
- Passwords are handled by Supabase Auth (bcrypt); the secret key never reaches the browser (`sb_secret_…` keys are rejected with HTTP 401 if sent from one).

See [`docs/SECURITY.md`](docs/SECURITY.md) for the full policy breakdown.

## Documentation

- [`docs/DATABASE.md`](docs/DATABASE.md) — schema reference
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Supabase + Vercel step-by-step
- [`docs/SECURITY.md`](docs/SECURITY.md) — roles and RLS policies
- [`docs/WORKFLOW.md`](docs/WORKFLOW.md) — the interview lifecycle
