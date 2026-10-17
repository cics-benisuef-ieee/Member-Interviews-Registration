import { z } from 'zod';

export const trackNameSchema = z
  .string()
  .trim()
  .min(2, 'Track name must be at least 2 characters.')
  .max(80, 'Track name is too long.');

export const trackIdSchema = z.string().uuid('Invalid track.');
