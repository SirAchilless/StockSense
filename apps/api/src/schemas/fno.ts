import { z } from 'zod';

export const symbolParam = z.object({
  symbol: z.string().trim().min(1).max(20).regex(/^[A-Z0-9]+$/i, 'Symbol must be alphanumeric'),
});

export const optionalDateQuery = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD').optional(),
});

export const optionalExpiryQuery = z.object({
  expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expiry must be YYYY-MM-DD').optional(),
});

export const aiCommentaryBody = z.object({
  symbol: z.string().trim().min(1).max(20).regex(/^[A-Z0-9]+$/i, 'Symbol must be alphanumeric'),
  metrics: z.array(z.enum(['rollover', 'participant_oi', 'cost_of_carry', 'oi_trends', 'pcr', 'market_wide_pcr'])).min(1).max(8),
});
