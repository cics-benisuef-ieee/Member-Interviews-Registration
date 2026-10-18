-- ============================================================================
-- 0006 · Read models
--
-- Every screen previously assembled itself from several sequential queries
-- (and, on the board, from a handful of extra lookups). These functions return
-- a whole screen in one round trip.
--
-- They are `security definer` on purpose: a board is only allowed to read its
-- own track's interviews (see 0004), yet it still needs the *name* of the track
-- a transferred member came from — a row belonging to a different track. The
-- functions do the authorisation check themselves and then read across that
-- boundary deliberately.
-- ============================================================================

-- ── Board: one track's queue for today ─────────────────────────────────────
-- Returns everything the board renders: the day, the queue, where each
-- transferred member came from, and the tracks it may transfer to.

create or replace function public.get_track_board(p_track_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_day   date := public.queue_day();
  v_board jsonb;
begin
  if not (public.is_admin() or p_track_id = public.my_track_id()) then
    raise exception 'You are not allowed to view that track.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'trackId', t.id,
    'trackName', t.name,
    'day', v_day,
    'entries', coalesce((
      select jsonb_agg(entry order by sort_number)
      from (
        select
          i.queue_number as sort_number,
          jsonb_build_object(
            'id', i.id,
            'queueNumber', i.queue_number,
            'status', i.status,
            'startedAt', i.started_at,
            'finishedAt', i.finished_at,
            'notes', i.notes,
            'transferredFromId', i.transferred_from_id,
            'sourceTrackName', src.name,
            'member', jsonb_build_object(
              'id', m.id,
              'fullName', m.full_name,
              'phone', m.phone
            )
          ) as entry
        from public.interviews i
        join public.members m on m.id = i.member_id
        left join public.interviews origin on origin.id = i.transferred_from_id
        left join public.tracks src on src.id = origin.track_id
        where i.track_id = p_track_id and i.queue_day = v_day
      ) rows
    ), '[]'::jsonb),
    'transferTargets', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name) order by o.name)
      from public.tracks o
      where o.is_active and o.id <> p_track_id
    ), '[]'::jsonb)
  )
  into v_board
  from public.tracks t
  where t.id = p_track_id;

  if v_board is null then
    raise exception 'Track not found.';
  end if;

  return v_board;
end;
$$;

-- ── Admin overview: today's activity for every track ───────────────────────
-- One aggregate query instead of "all interviews today" plus client-side
-- counting, which also means the database does the counting.

create or replace function public.get_admin_overview()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_day date := public.queue_day();
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'day', v_day,
    'tracks', coalesce((
      select jsonb_agg(summary order by track_name)
      from (
        select
          t.name as track_name,
          jsonb_build_object(
            'trackId', t.id,
            'trackName', t.name,
            'waitingCount', coalesce(count(*) filter (where i.status = 'WAITING'), 0),
            'finishedCount', coalesce(count(*) filter (
              where i.status in ('PASSED', 'REJECTED', 'NEEDS_ANOTHER_TRACK')
            ), 0),
            'nowServingName', max(m.full_name) filter (where i.status = 'IN_INTERVIEW')
          ) as summary
        from public.tracks t
        left join public.interviews i
          on i.track_id = t.id and i.queue_day = v_day
        left join public.members m on m.id = i.member_id
        group by t.id, t.name
      ) rows
    ), '[]'::jsonb)
  );
end;
$$;

-- ── History: paged, filterable, with transfer destinations ─────────────────
-- Returns the page, the total that matched (so the UI can paginate), today's
-- date, and the track list for the filter dropdown — one round trip for all.

create or replace function public.get_history(
  p_day      date default null,
  p_track_id uuid default null,
  p_limit    integer default 50,
  p_offset   integer default 0
)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_day     date := public.queue_day();
  v_limit   integer := greatest(1, least(coalesce(p_limit, 50), 200));
  v_offset  integer := greatest(0, coalesce(p_offset, 0));
  v_total   bigint;
  v_entries jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;

  select count(*)
  into v_total
  from public.interviews i
  where (p_day is null or i.queue_day = p_day)
    and (p_track_id is null or i.track_id = p_track_id);

  select coalesce(jsonb_agg(entry order by queue_day desc, queue_number), '[]'::jsonb)
  into v_entries
  from (
    select
      i.queue_day,
      i.queue_number,
      jsonb_build_object(
        'id', i.id,
        'queueDay', i.queue_day,
        'queueNumber', i.queue_number,
        'status', i.status,
        'startedAt', i.started_at,
        'finishedAt', i.finished_at,
        'trackName', t.name,
        'memberName', m.full_name,
        'transferredToTrackName', dest.name
      ) as entry
    from public.interviews i
    join public.members m on m.id = i.member_id
    join public.tracks t on t.id = i.track_id
    -- A member transferred on to a further track; lateral keeps it to one row
    -- even if the chain were ever branched.
    left join lateral (
      select dt.name
      from public.interviews child
      join public.tracks dt on dt.id = child.track_id
      where child.transferred_from_id = i.id
      limit 1
    ) dest on true
    where (p_day is null or i.queue_day = p_day)
      and (p_track_id is null or i.track_id = p_track_id)
    order by i.queue_day desc, i.queue_number
    limit v_limit
    offset v_offset
  ) rows;

  return jsonb_build_object(
    'day', v_day,
    'total', v_total,
    'limit', v_limit,
    'offset', v_offset,
    'entries', v_entries,
    'tracks', coalesce((
      select jsonb_agg(jsonb_build_object('id', t2.id, 'name', t2.name) order by t2.name)
      from public.tracks t2
    ), '[]'::jsonb)
  );
end;
$$;

-- ── Supporting indexes ─────────────────────────────────────────────────────

-- Walking "who was transferred from me" should not scan the table.
create index if not exists interviews_transferred_from
  on public.interviews (transferred_from_id);

-- History is listed newest-day-first, then by queue number.
create index if not exists interviews_day_number
  on public.interviews (queue_day desc, queue_number);

-- Substring search on members (admin search box) previously scanned every row.
create extension if not exists pg_trgm;
create index if not exists members_full_name_trgm
  on public.members using gin (full_name gin_trgm_ops);
create index if not exists members_phone_trgm
  on public.members using gin (phone gin_trgm_ops);

-- ── Grants ─────────────────────────────────────────────────────────────────
revoke execute on function public.get_track_board(uuid) from public, anon;
grant execute on function public.get_track_board(uuid) to authenticated, service_role;

revoke execute on function public.get_admin_overview() from public, anon;
grant execute on function public.get_admin_overview() to authenticated, service_role;

revoke execute on function public.get_history(date, uuid, integer, integer) from public, anon;
grant execute on function public.get_history(date, uuid, integer, integer) to authenticated, service_role;
