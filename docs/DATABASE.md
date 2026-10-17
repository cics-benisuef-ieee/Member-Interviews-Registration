# Database reference

Postgres schema managed by the SQL files in `supabase/migrations/`, applied in order.

## Tables

### `tracks`

Interview committees.

| Column     | Type        | Notes                                                 |
| ---------- | ----------- | ----------------------------------------------------- |
| id         | uuid        | primary key                                           |
| name       | text        | unique, displayed in UI, kept A→Z by queries          |
| slug       | text        | unique, used for the login email                      |
| is_active  | boolean     | disabled tracks vanish from the registration dropdown |
| created_at | timestamptz |                                                       |

### `members`

The people being interviewed.

| Column               | Type            | Notes                             |
| -------------------- | --------------- | --------------------------------- |
| id                   | uuid            | primary key                       |
| full_name            | text            | required                          |
| phone / email / text | text            | optional                          |
| notes                | text            | free text for interviewers        |
| created_by           | uuid → profiles | null for public self-registration |

### `interviews`

**One row per member × track × queue day** — the heart of the system.

| Column                   | Type              | Notes                                       |
| ------------------------ | ----------------- | ------------------------------------------- |
| member_id                | uuid → members    |                                             |
| track_id                 | uuid → tracks     |                                             |
| queue_day                | date              | the day the queue belongs to                |
| queue_number             | integer           | per track per day, starts at 1              |
| status                   | text enum         | see below                                   |
| transferred_from_id      | uuid → interviews | set when this row was created by a transfer |
| started_at / finished_at | timestamptz       |                                             |
| notes                    | text              | outcome notes                               |

Constraints:

- `unique (track_id, queue_day, queue_number)` — no duplicate queue numbers
- `unique (member_id, track_id, queue_day)` — a member can't be queued twice in the same track on the same day

### `profiles`

Login accounts (one per Supabase Auth user).

| Column       | Type                   | Notes                    |
| ------------ | ---------------------- | ------------------------ |
| id           | uuid → auth.users      |                          |
| display_name | text                   |                          |
| role         | `ADMIN` \| `COMMITTEE` |                          |
| track_id     | uuid → tracks          | required for `COMMITTEE` |

### `audit_log`

Every state change: who did what, from which status to which, when.

### `app_settings`

Key/value settings. `queue_timezone` defines when the queue day rolls over (default `Africa/Cairo`).

## Interview statuses

```
WAITING → IN_INTERVIEW → PASSED | REJECTED | NEEDS_ANOTHER_TRACK
```

A transfer sets the source row to `NEEDS_ANOTHER_TRACK` and creates a **new** `WAITING` row in the target track for the same day, linked by `transferred_from_id`.

## Queue functions (migrations/0005)

| Function                                                 | Callable by              | Purpose                                      |
| -------------------------------------------------------- | ------------------------ | -------------------------------------------- |
| `register_member(track, name, phone, email, notes)`      | anyone (incl. anonymous) | creates member + queued interview atomically |
| `start_interview(id)`                                    | track board / admin      | `WAITING → IN_INTERVIEW`                     |
| `complete_interview(id, outcome, target_track?, notes?)` | track board / admin      | pass, reject, or transfer                    |
| `get_queue_day()`                                        | anyone                   | today's date in the chapter timezone         |

All run as `security definer` with their own authorization checks, and assign queue numbers under a row lock — concurrent registrations can never collide.

## Regenerating types

Once the Supabase CLI is linked to your project:

```bash
npm run db:types
```

writes full generated types to `src/types/database.ts`. The hand-maintained row shapes there cover everything the app uses today.
