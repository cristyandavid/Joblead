import { z } from 'zod';

export const CreateCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().min(7).max(30),
  email: z.string().email().optional().or(z.literal('')),
  companyName: z.string().max(200).optional(),
});

export const UpdateCustomerSchema = CreateCustomerSchema.partial();

export const CreateAddressSchema = z.object({
  label: z.string().max(100).optional(),
  street: z.string().min(1).max(300),
  city: z.string().min(1).max(100),
  province: z.string().min(2).max(100),
  postalCode: z.string().min(3).max(20),
  notes: z.string().max(1000).optional(),
});

export const UpdateAddressSchema = CreateAddressSchema.partial();

export const CustomerQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateCustomerDto = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerDto = z.infer<typeof UpdateCustomerSchema>;
export type CreateAddressDto = z.infer<typeof CreateAddressSchema>;
export type UpdateAddressDto = z.infer<typeof UpdateAddressSchema>;
export type CustomerQueryDto = z.infer<typeof CustomerQuerySchema>;
