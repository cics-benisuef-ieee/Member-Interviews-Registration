-- ============================================================================
-- 0001 · Tracks + app settings
-- A "track" is an interview committee (e.g. "Front-end Development").
-- ============================================================================

create table public.tracks (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null unique,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.tracks is 'Interview committees. Formerly referred to as "committees".';

-- Single-row-per-key application settings. The queue day is computed in the
-- database (not the app) so every screen agrees on what "today" means.
create table public.app_settings (
  key   text primary key,
  value text not null
);

insert into public.app_settings (key, value) values ('queue_timezone', 'Africa/Cairo');

alter table public.tracks enable row level security;
alter table public.app_settings enable row level security;
