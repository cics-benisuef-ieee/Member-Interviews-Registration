-- ============================================================================
-- 0003 · Profiles (login accounts) + helper functions
-- Each track has one shared login (role COMMITTEE, bound to its track).
-- ADMIN accounts manage everything.
-- ============================================================================

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  role         text not null check (role in ('ADMIN', 'COMMITTEE')),
  track_id     uuid references public.tracks (id) on delete set null,
  created_at   timestamptz not null default now(),
  constraint committee_has_track check (role = 'ADMIN' or track_id is not null)
);

alter table public.profiles enable row level security;

-- ── Helper functions used inside RLS policies ──────────────────────────────

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'ADMIN'
  );
$$;

create or replace function public.my_track_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select track_id from public.profiles where id = auth.uid();
$$;

-- ── Queue day ──────────────────────────────────────────────────────────────
-- The single source of truth for "today". Uses the chapter's timezone from
-- app_settings so the queue resets at local midnight, not UTC midnight.

create or replace function public.queue_day()
returns date
language sql stable security definer set search_path = public
as $$
  select (now() at time zone (
    select value from public.app_settings where key = 'queue_timezone'
  ))::date;
$$;

create or replace function public.get_queue_day()
returns date
language sql stable security definer set search_path = public
as $$
  select public.queue_day();
$$;

revoke execute on function public.get_queue_day() from public, anon;
grant execute on function public.get_queue_day() to authenticated, anon, service_role;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;
revoke execute on function public.my_track_id() from public;
grant execute on function public.my_track_id() to authenticated, service_role;
