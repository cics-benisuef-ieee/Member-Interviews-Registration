import { z } from 'zod';
import { INTERVIEW_OUTCOMES } from './interview.constants';

export const transferInputSchema = z.object({
  interviewId: z.string().uuid(),
  targetTrackId: z.string().uuid('Choose a track.'),
  notes: z.string().trim().max(1000).optional(),
});

export const finishInputSchema = z.object({
  interviewId: z.string().uuid(),
  outcome: z.enum(INTERVIEW_OUTCOMES),
  targetTrackId: z.string().uuid().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const memberRegistrationSchema = z.object({
  trackId: z.string().uuid('Choose a track.'),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters.').max(120),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().email('Enter a valid email address.').optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional(),
});

export type TransferInput = z.infer<typeof transferInputSchema>;
export type MemberRegistrationInput = z.infer<typeof memberRegistrationSchema>;
