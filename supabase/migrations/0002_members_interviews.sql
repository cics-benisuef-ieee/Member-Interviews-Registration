-- ============================================================================
-- 0002 · Members + interviews + audit trail
-- One interview row per member × track × queue day. A same-day transfer
-- simply creates a second interview row for the same member, linked to the
-- first via transferred_from_id.
-- ============================================================================

create table public.members (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null,
  phone      text,
  email      text,
  notes      text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

create table public.interviews (
  id                  uuid primary key default gen_random_uuid(),
  member_id           uuid not null references public.members (id) on delete cascade,
  track_id            uuid not null references public.tracks (id) on delete restrict,
  queue_day           date not null,
  queue_number        integer not null,
  status              text not null default 'WAITING'
                        check (status in ('WAITING', 'IN_INTERVIEW', 'PASSED', 'REJECTED', 'NEEDS_ANOTHER_TRACK')),
  transferred_from_id uuid references public.interviews (id) on delete set null,
  notes               text,
  started_at          timestamptz,
  finished_at         timestamptz,
  created_at          timestamptz not null default now(),
  created_by          uuid references public.profiles (id) on delete set null,
  constraint queue_number_positive check (queue_number > 0),
  constraint one_slot_per_day_per_track unique (track_id, queue_day, queue_number)
);

-- A member cannot appear twice in the same track's queue on the same day.
create unique index one_interview_per_member_track_day
  on public.interviews (member_id, track_id, queue_day);

create index interviews_track_day_status
  on public.interviews (track_id, queue_day, status);

create index interviews_day on public.interviews (queue_day);

create table public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  interview_id uuid references public.interviews (id) on delete cascade,
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  from_status text,
  to_status   text,
  detail      jsonb,
  created_at  timestamptz not null default now()
);

alter table public.members enable row level security;
alter table public.interviews enable row level security;
alter table public.audit_log enable row level security;
