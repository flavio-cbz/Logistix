import { z } from "zod";

export const statsSearchParamsSchema = z.object({
    period: z.enum(['7d', '30d', '90d', '1y', 'all']).default('30d'),
    groupBy: z.enum(['day', 'week', 'month']).default('day'),
});

export type StatsSearchParams = z.infer<typeof statsSearchParamsSchema>;
