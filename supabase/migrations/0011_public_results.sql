-- ============================================================================
-- 0011 · Public result lookup
-- Lets a member who already registered (and was interviewed) see their own
-- result by proving who they are with the email address and phone number
-- they registered with.
--
-- RLS denies anon every read of `members` and `interviews`, so — like
-- `register_member` and `get_tv_boards` — this runs as `security definer` and
-- hands back only what a member is owed: track, day, queue number, status,
-- score, recommendation. Never interviewer notes or per-criterion scores,
-- never anyone else's row: a caller only ever matches their own interviews.
--
-- Matching runs on the durable interview snapshot (0010), which survives the
-- member purge; the live `members` row is a fallback for older rows. BOTH the
-- email and the phone must match — one without the other gets nothing.
-- ============================================================================

-- Internal helper: a phone number reduced to comparable digits.
-- "+20 100 000 0000", "0100 000 0000" and "201000000000" are the same
-- number: keep the digits, then drop the country code (20) or the trunk
-- zero (0) — on both the stored value and the input, so they line up.
create or replace function private.result_phone_key(p_phone text)
returns text
language sql immutable
as $$
  select case
    when length(d) > 11 and left(d, 2) = '20' then right(d, -2)
    when length(d) = 11 and left(d, 1) = '0' then right(d, -1)
    else d
  end
  from (select regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') as d) s;
$$;

-- ── Result lookup (public — callable by anonymous visitors) ────────────────

create or replace function public.lookup_member_results(p_email text, p_phone text)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_phone text := private.result_phone_key(p_phone);
  v_rows  jsonb;
begin
  if v_email = '' or v_phone = '' then
    raise exception 'Both an email address and a phone number are required.';
  end if;

  select coalesce(jsonb_agg(result order by queue_day desc, queue_number), '[]'::jsonb)
  into v_rows
  from (
    select
      jsonb_build_object(
        'memberName', coalesce(nullif(i.member_name, ''), m.full_name),
        'trackName', t.name,
        'queueDay', i.queue_day,
        'queueNumber', i.queue_number,
        'status', i.status,
        'recommendation', i.recommendation,
        'overallTotal', i.overall_total,
        'finishedAt', i.finished_at
      ) as result,
      i.queue_day,
      i.queue_number
    from public.interviews i
    join public.tracks t on t.id = i.track_id
    left join public.members m on m.id = i.member_id
    where lower(nullif(trim(coalesce(nullif(i.member_email, ''), m.email, '')), '')) = v_email
      and private.result_phone_key(coalesce(nullif(i.member_phone, ''), m.phone, '')) = v_phone
  ) matches;

  return v_rows;
end;
$$;

-- ── Grants ─────────────────────────────────────────────────────────────────
-- The results page is public: anonymous visitors read only what this function
-- returns, and only for the row(s) their own email + phone prove they own.
revoke execute on function public.lookup_member_results(text, text) from public;
grant execute on function public.lookup_member_results(text, text) to anon, authenticated, service_role;
