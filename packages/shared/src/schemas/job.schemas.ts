import { z } from 'zod';
import { JobStatus, JobPriority } from '../types/enums';

export const CreateJobSchema = z.object({
  customerId: z.string().uuid(),
  addressId: z.string().uuid(),
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  priority: z.nativeEnum(JobPriority).default(JobPriority.MEDIUM),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  depositRequired: z.boolean().default(false),
  depositAmount: z.number().int().min(0).optional().nullable(),
});

export const UpdateJobSchema = CreateJobSchema.partial();

export const JobStatusUpdateSchema = z.object({
  status: z.nativeEnum(JobStatus),
  note: z.string().max(2000).optional(),
});

export const AddJobNoteSchema = z.object({
  message: z.string().min(1).max(5000),
});

export const JobQuerySchema = z.object({
  status: z.nativeEnum(JobStatus).optional(),
  priority: z.nativeEnum(JobPriority).optional(),
  customerId: z.string().uuid().optional(),
  startDateFrom: z.string().datetime().optional(),
  startDateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateJobDto = z.infer<typeof CreateJobSchema>;
export type UpdateJobDto = z.infer<typeof UpdateJobSchema>;
export type JobStatusUpdateDto = z.infer<typeof JobStatusUpdateSchema>;
export type AddJobNoteDto = z.infer<typeof AddJobNoteSchema>;
export type JobQueryDto = z.infer<typeof JobQuerySchema>;
