import { z } from 'zod';
import { UserRole } from '../types/enums';

export const UpdateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(UserRole).optional(),
  password: z.string().min(8).max(100).optional(),
});

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
