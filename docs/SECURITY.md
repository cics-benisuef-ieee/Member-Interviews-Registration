# Security model

## Roles

| Role                       | How they sign in       | Reach                                                           |
| -------------------------- | ---------------------- | --------------------------------------------------------------- |
| Anonymous visitor          | none                   | Registration form only: reads active tracks, registers a member |
| Track board (`COMMITTEE`)  | shared login per track | Its own track's queue, read + state changes                     |
| Admin (`ADMIN`)            | one admin login        | Everything                                                      |
| Secret key (`sb_secret_…`) | server-only            | Credential management; never exposed to the browser             |

Supabase maps API keys to Postgres roles: the publishable key acts as `anon` (signed out) or `authenticated` (signed in), and the secret key acts as `service_role`, which bypasses RLS entirely.

## Row Level Security (migrations/0004)

Every table has RLS enabled.

| Table        | Who can read                        | Who can write                                               |
| ------------ | ----------------------------------- | ----------------------------------------------------------- |
| tracks       | everyone                            | admin only                                                  |
| app_settings | everyone (read)                     | admin only                                                  |
| profiles     | own profile; admin reads all        | secret key only (account creation)                          |
| members      | any signed-in user                  | admin (update/delete); inserts only via `register_member()` |
| interviews   | admin all; board only its own track | **no direct writes** — only via the queue functions         |
| audit_log    | admin                               | functions only                                              |

The interviews policy is the important one:

```sql
using (public.is_admin() or track_id = public.my_track_id())
```

A track board literally cannot see another track's queue through the API — even by hand-crafting requests.

## Queue functions (migrations/0005–0010)

The mutating functions are `security definer` and re-check authorization internally:

- `register_member` — open to anonymous (it only ever creates a `WAITING` entry).
- `start_interview` / `complete_interview` / `change_interview_outcome` / `reopen_interview` — require the caller to be an admin, or a committee user whose track owns the interview (`private.can_manage_interview`).
- `update_member_details` / `delete_members` / `purge_past_members` — admin only (the seed/scripts reach them with the secret key, which carries no `auth.uid()`).

Transfers additionally validate: target track must be different, active, and not already containing that member today.

Member edits and deletions never touch an earlier day's interview: those rows keep their own member snapshot (0010), so `delete_members` only clears **today's** entries and `purge_past_members` leaves history untouched by design.

## Other measures

- Passwords are stored and verified by Supabase Auth (bcrypt); the app never touches password hashes.
- Sessions are httpOnly cookies refreshed by middleware on every request.
- All form input is validated with Zod before reaching the database; database functions validate again.
- Queue numbering happens under a row lock inside Postgres — no client-supplied numbers.
- The `private` schema (internal helpers) is not exposed through the API.
