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
| tv_visible | boolean     | opt-in: the track appears on the public /tv display   |
| created_at | timestamptz |                                                       |

### `members`

The **live** registration table: the people queued for today.

| Column               | Type            | Notes                                |
| -------------------- | --------------- | ------------------------------------ |
| id                   | uuid            | primary key                          |
| full_name            | text            | required                             |
| phone / email / text | text            | optional                             |
| position             | text            | optional role detail ("Year 3 · CS") |
| notes                | text            | free text for interviewers           |
| created_by           | uuid → profiles | null for public self-registration    |

Since **0010** members do not outlive their day. Every interview carries its own copy of the person (see below), so a member can be cleared from this table once their day is over — `purge_past_members()` runs from the History page's **Clear past members** button or `npm run db:purge-past` — without losing anything. The admin members list is scoped to **today's** queue day for the same reason: a finished day's people live in History.

### `interviews`

**One row per member × track × queue day** — the heart of the system.

| Column                                                                     | Type              | Notes                                                                                                 |
| -------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------- |
| member_id                                                                  | uuid → members    | soft link: `on delete set null`, null once the member is purged                                       |
| member_ref                                                                 | uuid              | durable identity of the person, kept after `member_id` is cleared — what history edits                |
| member_name / member_phone / member_email / member_position / member_notes | text              | snapshot of the member, stamped on insert (0010) and kept in step by `update_member_details`          |
| track_id                                                                   | uuid → tracks     |                                                                                                       |
| queue_day                                                                  | date              | the day the queue belongs to                                                                          |
| queue_number                                                               | integer           | per track per day, starts at 1                                                                        |
| status                                                                     | text enum         | see below                                                                                             |
| transferred_from_id                                                        | uuid → interviews | set when this row was created by a transfer                                                           |
| started_at / finished_at                                                   | timestamptz       |                                                                                                       |
| notes                                                                      | text              | outcome notes                                                                                         |
| evaluation                                                                 | jsonb             | `{ data, scores }` — interviewer fields + per-criterion `{ score, notes }`; partial saves are drafts  |
| overall_total                                                              | integer           | sum of the eleven criterion scores (0–100) — **null while the evaluation is a draft**                 |
| recommendation                                                             | text enum         | `ACCEPTED` \| `NEEDS_TRAINING` \| `REJECTED` — stored separately from the score; null while undecided |
| final_notes                                                                | text              | additional notes                                                                                      |
| evaluation_updated_at                                                      | timestamptz       | when the evaluation was last saved                                                                    |

Constraints:

- `unique (track_id, queue_day, queue_number)` — no duplicate queue numbers
- `unique (member_id, track_id, queue_day)` — a member can't be queued twice in the same track on the same day
- `overall_total between 0 and 100` — a total only comes from the evaluation form (criterion maximums live in `src/domain/interviews/evaluation.ts`)

The member snapshot is what makes **history self-contained**: a row read after the member's `members` row is gone still shows the name, phone, email, position and notes. A `before insert or update of member_id` trigger (`private.stamp_interview_member`) fills it from the member row, so no writer — the queue functions, the seed/demo scripts, the integration test — has to remember the five columns.

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
WAITING ⇄ IN_INTERVIEW → PASSED | REJECTED | NEEDS_ANOTHER_TRACK
         (unstart)          └───────────┬───────────┘
                                        │  editable (0009)
                                        ▼
                                     WAITING
```

Any `WAITING` row can be started — skipping ahead is allowed and queue order stays as printed. An **unstart** (`IN_INTERVIEW → WAITING`) keeps the queue number and the evaluation saved so far; only the clock resets. Finishing (pass, reject, transfer) requires a **complete evaluation** — every criterion scored with a note, both interviewer fields, plus a recommendation — enforced in `complete_interview`.

A transfer sets the source row to `NEEDS_ANOTHER_TRACK` and creates a **new** `WAITING` row in the target track for the same day, linked by `transferred_from_id`.

Since **0009** a finished interview is not frozen: its evaluation can be saved again, its decision swapped (`PASSED ⇄ REJECTED`) by `change_interview_outcome`, and it can be reopened into the queue as `WAITING` by `reopen_interview` — the clock resets but the queue number and evaluation survive. Reopening a transfer also deletes the receiving entry, but only while it is still `WAITING`, unstarted, and never handed on; once the receiving track has started the member the function refuses. Editing a finished interview back into an incomplete evaluation sets `overall_total` back to null, re-locking the finish gate.

## The evaluation form (src/domain/interviews/evaluation.ts)

One global form for every track — 100 points in total, and every criterion needs a score _and_ a note:

| Section          | Criteria                                                                                                                                  | Points      |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Attitude         | Motivation & Enthusiasm, Teamwork & Collaboration, Commitment & Discipline, Communication & Confidence, Flexibility & Feedback Acceptance | 5 × 10 = 50 |
| Technical Skills | Technical Knowledge, Analytical Thinking, Projects / Experience, Practical Application                                                    | 4 × 10 = 40 |
| IEEE Knowledge   | Understanding IEEE Goals, Knowledge of Student Branch                                                                                     | 2 × 5 = 10  |

The **Data** section records the two interviewers (technical and attitude); the member's name and position are autofilled read-only. The **Final evaluation** shows the computed total and the recommendation (`ACCEPTED` / `NEEDS_TRAINING` / `REJECTED`), which is a separate judgement and never counted into the score.

Saving is a **draft action** (allowed on any interview — open or finished — as often as the committee likes, with any part of the form filled in) — "Save draft" stores whatever exists so far and leaves `overall_total` null, while "Save evaluation" validates the finished form. The board also keeps an unsaved copy in the browser (`localStorage`, keyed by interview id) so a refresh, a reload, or navigating away and back never clears work in progress. Finishing is gated on completion, both in the app and in the database: a draft cannot end an interview.

## Queue functions (migrations/0005–0010)

| Function                                                             | Callable by              | Purpose                                                                                      |
| -------------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------- |
| `register_member(track, name, phone, email, notes)`                  | anyone (incl. anonymous) | creates member + queued interview atomically                                                 |
| `start_interview(id)`                                                | track board / admin      | `WAITING → IN_INTERVIEW` (any waiting row)                                                   |
| `unstart_interview(id)`                                              | track board / admin      | back to `WAITING`, keeping queue # + evaluation                                              |
| `save_interview_evaluation(id, evaluation, recommendation, notes?)`  | track board / admin      | stores the data section + scored criteria (partial form = draft; works on finished rows too) |
| `complete_interview(id, outcome, target_track?, notes?)`             | track board / admin      | pass, reject, or transfer (evaluation required)                                              |
| `change_interview_outcome(id, outcome)`                              | track board / admin      | swap a finished decision (`PASSED ⇄ REJECTED`)                                               |
| `reopen_interview(id)`                                               | track board / admin      | back to `WAITING`; cancels an untouched transfer hand-off                                    |
| `update_member_details(id, name, phone?, email?, position?, notes?)` | admin                    | edits the shared `members` row **and** every interview snapshot for that person (0010)       |
| `delete_members(ids)`                                                | admin                    | removes members and their **today** queue entries; earlier days are kept                     |
| `purge_past_members(before?)`                                        | admin                    | clears members whose interviews are all before `before` (today by default) — history kept    |
| `get_queue_day()`                                                    | anyone                   | today's date in the chapter timezone                                                         |
| `get_track_board(track)`                                             | track board / admin      | one track's full queue screen                                                                |
| `get_tv_boards()`                                                    | anyone (incl. anonymous) | summaries of the tracks marked `tv_visible`                                                  |

All run as `security definer` with their own authorization checks, and assign queue numbers under a row lock — concurrent registrations can never collide.

## Regenerating types

Once the Supabase CLI is linked to your project:

```bash
npm run db:types
```

writes full generated types to `src/types/database.ts`. The hand-maintained row shapes there cover everything the app uses today.
