import { z } from 'zod';
import { PaymentMethod } from '../types/enums';

export const InvoiceLineItemSchema = z.object({
  name: z.string().min(1).max(300),
  description: z.string().max(1000).optional(),
  qty: z.number().positive(),
  unit: z.string().min(1).max(50),
  unitPriceCents: z.number().int().min(0),
});

export const CreateInvoiceSchema = z.object({
  dueDate: z.string().datetime().optional().nullable(),
  lineItems: z.array(InvoiceLineItemSchema).min(1),
  notes: z.string().max(5000).optional(),
});

export const UpdateInvoiceSchema = z.object({
  dueDate: z.string().datetime().optional().nullable(),
  lineItems: z.array(InvoiceLineItemSchema).optional(),
  notes: z.string().max(5000).optional(),
});

export const CreatePaymentSchema = z.object({
  amountCents: z.number().int().positive(),
  method: z.nativeEnum(PaymentMethod),
  receivedAt: z.string().datetime(),
  notes: z.string().max(1000).optional(),
});

export type InvoiceLineItemDto = z.infer<typeof InvoiceLineItemSchema>;
export type CreateInvoiceDto = z.infer<typeof CreateInvoiceSchema>;
export type UpdateInvoiceDto = z.infer<typeof UpdateInvoiceSchema>;
export type CreatePaymentDto = z.infer<typeof CreatePaymentSchema>;
