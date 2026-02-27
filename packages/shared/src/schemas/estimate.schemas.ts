import { z } from 'zod';

export const EstimateLineItemSchema = z.object({
  name: z.string().min(1).max(300),
  description: z.string().max(1000).optional(),
  qty: z.number().positive(),
  unit: z.string().min(1).max(50),
  unitPriceCents: z.number().int().min(0),
});

export const CreateEstimateSchema = z.object({
  notes: z.string().max(5000).optional(),
  lineItems: z.array(EstimateLineItemSchema).min(1),
});

export const UpdateEstimateSchema = z.object({
  notes: z.string().max(5000).optional(),
  lineItems: z.array(EstimateLineItemSchema).optional(),
});

export type EstimateLineItemDto = z.infer<typeof EstimateLineItemSchema>;
export type CreateEstimateDto = z.infer<typeof CreateEstimateSchema>;
export type UpdateEstimateDto = z.infer<typeof UpdateEstimateSchema>;
