'use client';

import { deleteMemberAction } from '@/actions/member.actions';
import { Badge } from '@/components/ui/Badge';
import { RECOMMENDATION_LABELS, type Recommendation } from '@/domain/interviews/evaluation';
import type { MemberWithStatus, MemberTodayInterview } from '@/domain/members/member.types';
import type { ActionState } from '@/lib/action-state';
import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { useActionState, useState } from 'react';
import { formatQueueNumber, formatTime, statusLabel, statusTone } from '../queue/queue.format';
import { MemberEditForm } from './MemberEditForm';
import { MemberInterviewReview } from './MemberInterviewReview';
import { dayStatusLabel, dayStatusTone } from './members.format';

/**
 * One member in the admin list: their committee today, where they stand in
 * the queue, their details — with an expandable per-interview panel that can
 * review and correct each decision, and inline editing and deletion.
 *
 * Deleting removes the member and their today's queue entries — the way to undo
 * a mistaken registration. Earlier days are history and are never touched, so it
 * still takes two deliberate clicks.
 */
export function MemberListItem({ member }: { member: MemberWithStatus }) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [deleteState, deleteAction, deletePending] = useActionState<ActionState, FormData>(
    deleteMemberAction,
    { error: null },
  );

  const transferred = member.registeredTrackName !== member.currentTrackName;

  return (
    <li className="border-b border-hairline px-5 py-4 last:border-b-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ieee-navy">{member.fullName}</p>
            {member.position && <p className="text-sm text-ieee-gray">· {member.position}</p>}
            <Badge tone={member.dayStatus ? dayStatusTone(member.dayStatus) : 'neutral'}>
              {member.dayStatus ? dayStatusLabel(member.dayStatus) : 'Not queued today'}
            </Badge>
          </div>

          {member.registeredTrackName && (
            <p className="mt-1 text-sm text-ieee-gray">
              Registered in: <span className="font-semibold">{member.registeredTrackName}</span>
              {transferred && member.currentTrackName && (
                <>
                  {' → '}
                  Now at: <span className="font-semibold">{member.currentTrackName}</span>
                </>
              )}
            </p>
          )}

          <p className="mt-1 text-sm text-ieee-gray">
            {member.phone ?? 'No phone'}
            {member.email && ` · ${member.email}`}
          </p>
          {member.notes && <p className="mt-1 text-sm text-ieee-gray italic">{member.notes}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {confirmingDelete ? (
            <>
              <form action={deleteAction}>
                <input type="hidden" name="memberId" value={member.id} />
                <button
                  type="submit"
                  disabled={deletePending}
                  className="inline-flex items-center gap-1 rounded-xl bg-ieee-red-dark px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-ieee-red disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deletePending ? 'Deleting…' : 'Delete forever'}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="rounded-xl px-3 py-1.5 text-sm font-semibold text-ieee-gray transition-colors hover:bg-hairline/60 hover:text-ieee-navy"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              {member.todayInterviews.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowDetails((value) => !value)}
                  aria-expanded={showDetails}
                  className="inline-flex items-center gap-1 rounded-xl border border-hairline px-3 py-1.5 text-sm font-semibold text-ieee-gray transition-colors hover:border-ieee-blue hover:text-ieee-blue"
                >
                  {showDetails ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  Details
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditing((value) => !value)}
                className="inline-flex items-center gap-1 rounded-xl border border-hairline px-3 py-1.5 text-sm font-semibold text-ieee-gray transition-colors hover:border-ieee-blue hover:text-ieee-blue"
              >
                <Pencil className="h-3.5 w-3.5" />
                {editing ? 'Close' : 'Edit'}
              </button>
              <button
                type="button"
                title="Removes this member and their today's queue entries; their history is kept"
                onClick={() => setConfirmingDelete(true)}
                className="inline-flex items-center gap-1 rounded-xl border border-ieee-red-dark/30 px-3 py-1.5 text-sm font-semibold text-ieee-red-dark transition-colors hover:bg-ieee-red-dark hover:text-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {deleteState.error && (
        <p className="mt-3 rounded-lg bg-ieee-red-dark/5 px-3 py-2 text-sm font-semibold text-ieee-red-dark">
          {deleteState.error}
        </p>
      )}

      {showDetails && (
        <div className="mt-3 space-y-2">
          {member.todayInterviews.map((entry) => (
            <TodayInterviewPanel
              key={entry.id}
              entry={entry}
              member={member}
              transferred={transferred}
              isCurrent={isCurrentEntry(entry, member.todayInterviews)}
            />
          ))}
        </div>
      )}

      {editing && (
        <div className="mt-3">
          <MemberEditForm member={member} onDone={() => setEditing(false)} />
        </div>
      )}
    </li>
  );
}

/** One of today's interviews, with the details an admin scans for. */
function TodayInterviewPanel({
  entry,
  member,
  transferred,
  isCurrent,
}: {
  entry: MemberTodayInterview;
  member: MemberWithStatus;
  transferred: boolean;
  isCurrent: boolean;
}) {
  return (
    <div className="rounded-lg border border-hairline bg-surface px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={statusTone(entry.status)}>{statusLabel(entry.status)}</Badge>
        <span className="font-semibold text-ieee-navy">{entry.trackName}</span>
        <span className="text-ieee-gray">Queue {formatQueueNumber(entry.queueNumber)}</span>
        {entry.transferredFromId === null && (
          <span className="text-xs text-ieee-gray">registered here</span>
        )}
        {transferred && isCurrent && <span className="text-xs text-ieee-gray">current</span>}
        {entry.overallTotal !== null && <Badge tone="neutral">{entry.overallTotal}/100</Badge>}
        {entry.recommendation && <RecommendationTag recommendation={entry.recommendation} />}
      </div>

      <p className="mt-1 text-xs text-ieee-gray">
        Started {formatTime(entry.startedAt)} · Finished {formatTime(entry.finishedAt)}
        {entry.interviewers.length > 0 && ` · ${entry.interviewers.join(', ')}`}
      </p>

      <MemberInterviewReview entry={entry} member={member} />
    </div>
  );
}

/** Tone per recommendation, so a scan of the list reads at a glance. */
const RECOMMENDATION_TONES: Record<Recommendation, string> = {
  ACCEPTED: 'text-ieee-green-dark',
  NEEDS_TRAINING: 'text-ieee-orange-dark',
  REJECTED: 'text-ieee-red-dark',
};

function RecommendationTag({ recommendation }: { recommendation: Recommendation }) {
  return (
    <span className={`text-xs font-semibold ${RECOMMENDATION_TONES[recommendation]}`}>
      {RECOMMENDATION_LABELS[recommendation]}
    </span>
  );
}

/**
 * The current stop of the member's day: an entry no other of today's entries
 * was transferred out of. Mirrors the folding done in the members service.
 */
function isCurrentEntry(entry: MemberTodayInterview, all: MemberTodayInterview[]): boolean {
  const handedOn = new Set(
    all.map((candidate) => candidate.transferredFromId).filter((id): id is string => id !== null),
  );
  return !handedOn.has(entry.id);
}
