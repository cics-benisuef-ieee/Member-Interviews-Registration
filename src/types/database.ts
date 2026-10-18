/**
 * Row shapes mirrored from the Supabase schema, used by repositories to cast
 * query results into domain types. Regenerate the full types with
 * `npm run db:types` once the project is linked to Supabase.
 */

export interface TrackRow {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  tv_visible: boolean;
}

export interface MemberRow {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  position: string | null;
}

export interface InterviewRow {
  id: string;
  member_id: string;
  track_id: string;
  queue_day: string;
  queue_number: number;
  status: 'WAITING' | 'IN_INTERVIEW' | 'PASSED' | 'REJECTED' | 'NEEDS_ANOTHER_TRACK';
  transferred_from_id: string | null;
  notes: string | null;
  started_at: string | null;
  finished_at: string | null;
  /** The evaluation document: the data section plus per-criterion scores. */
  evaluation: StoredEvaluation | null;
  overall_total: number | null;
  recommendation: 'ACCEPTED' | 'NEEDS_TRAINING' | 'REJECTED' | null;
  final_notes: string | null;
  evaluation_updated_at: string | null;
}

/** The `interviews.evaluation` jsonb document written by the form. */
export interface StoredEvaluation {
  data?: {
    interviewerTechnical?: string;
    interviewerAttitude?: string;
  };
  scores?: Record<string, { score?: number; notes?: string }>;
}

export interface ProfileRow {
  id: string;
  display_name: string;
  role: 'ADMIN' | 'COMMITTEE';
  track_id: string | null;
}
