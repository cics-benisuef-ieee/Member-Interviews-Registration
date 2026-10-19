'use server';

import { lookupResults } from '@/domain/results/result.service';
import { resultLookupSchema } from '@/domain/results/result.schema';
import type { MemberResult } from '@/domain/results/result.types';
import { actionFailed } from '@/lib/action-state';

export interface ResultLookupState {
  error: string | null;
  /** The matched interviews, newest first; null until a lookup succeeds. */
  results: MemberResult[] | null;
}

/**
 * Public result lookup: matches the email + phone the member registered with
 * and hands back their own interview outcomes. No session is needed — the
 * pair itself is the proof (0011), and the query is scoped to it.
 */
export async function lookupResultsAction(
  _prevState: ResultLookupState,
  formData: FormData,
): Promise<ResultLookupState> {
  const parsed = resultLookupSchema.safeParse({
    email: formData.get('email'),
    phone: formData.get('phone'),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Check the form fields.',
      results: null,
    };
  }

  try {
    const results = await lookupResults(parsed.data);
    return { error: null, results };
  } catch (error) {
    return {
      ...actionFailed(error, 'Could not look up your result. Please try again.'),
      results: null,
    };
  }
}
