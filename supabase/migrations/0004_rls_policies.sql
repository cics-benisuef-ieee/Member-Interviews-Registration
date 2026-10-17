-- ============================================================================
-- 0004 · Row Level Security policies
-- Reads are role-scoped; writes to interviews/members only happen through the
-- security-definer functions in 0005 (RLS simply denies direct writes).
-- ============================================================================

-- ── Tracks ─────────────────────────────────────────────────────────────────
-- Everyone (including the public registration page) may read active tracks.

create policy "tracks are readable by everyone"
  on public.tracks for select
  using (true);

create policy "only admins create tracks"
  on public.tracks for insert
  with check (public.is_admin());

create policy "only admins update tracks"
  on public.tracks for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "only admins delete tracks"
  on public.tracks for delete
  using (public.is_admin());

-- ── App settings ───────────────────────────────────────────────────────────

create policy "settings are readable"
  on public.app_settings for select
  using (true);

create policy "only admins change settings"
  on public.app_settings for update
  using (public.is_admin())
  with check (public.is_admin());

-- ── Profiles ───────────────────────────────────────────────────────────────

create policy "read own profile or any as admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

-- Profiles are created by the service role (seed script / admin panel),
-- which bypasses RLS — no insert/update policies on purpose.

-- ── Members ────────────────────────────────────────────────────────────────
-- Signed-in boards need member names for their queue; admins need everything.
-- Inserts happen only via register_member() (security definer).

create policy "authenticated users read members"
  on public.members for select
  to authenticated
  using (true);

create policy "only admins edit members"
  on public.members for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "only admins delete members"
  on public.members for delete
  using (public.is_admin());

-- ── Interviews ─────────────────────────────────────────────────────────────
-- A board sees only its own track's interviews; admins see everything.
-- All writes go through start_interview() / complete_interview() /
-- register_member() — no direct write policies exist.

create policy "boards read their own track, admins read all"
  on public.interviews for select
  to authenticated
  using (public.is_admin() or track_id = public.my_track_id());

-- ── Audit log ──────────────────────────────────────────────────────────────

create policy "only admins read the audit log"
  on public.audit_log for select
  using (public.is_admin());
