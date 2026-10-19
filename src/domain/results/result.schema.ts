import { z } from 'zod';

/**
 * What a member proves their identity with on the public results page: both
 * the email and the phone they registered with. The database matches on the
 * same pair (0011), so a typo in either field finds nothing.
 */
export const resultLookupSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter the email address you registered with.')
    .email('Enter a valid email address.'),
  phone: z
    .string()
    .trim()
    .min(6, 'Enter the phone number you registered with.')
    .max(40, 'That phone number is too long.'),
});

export type ResultLookupInput = z.infer<typeof resultLookupSchema>;
