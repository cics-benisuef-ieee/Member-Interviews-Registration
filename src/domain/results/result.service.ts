import * as resultRepo from './result.repo';
import { resultLookupSchema } from './result.schema';
import type { MemberResult } from './result.types';

/** Shown when the email + phone pair matches no interview at all. */
export const NO_MATCH_MESSAGE =
  'No interview matches that email and phone number. Check both — they must be the ones you registered with.';

/**
 * Public result lookup.
 *
 * A member proves who they are with the email and phone they registered with;
 * the database returns every interview that pair owns, newest first. No match
 * is an ordinary outcome, not a failure, so it is raised with a message the
 * form can show verbatim.
 */
export async function lookupResults(input: {
  email: string;
  phone: string;
}): Promise<MemberResult[]> {
  const parsed = resultLookupSchema.parse(input);

  const results = await resultRepo.lookupResults(parsed.email, parsed.phone);
  if (results.length === 0) throw new Error(NO_MATCH_MESSAGE);

  return results;
}
