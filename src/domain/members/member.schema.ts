import { z } from 'zod';

export const memberInputSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters.').max(120),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((value) => value || undefined),
  email: z
    .string()
    .trim()
    .email('Enter a valid email address.')
    .optional()
    .or(z.literal(''))
    .transform((value) => value || undefined),
  notes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((value) => value || undefined),
});

export type MemberInput = z.infer<typeof memberInputSchema>;
