export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  CREW = 'CREW',
}

export enum JobStatus {
  LEAD = 'LEAD',
  ESTIMATING = 'ESTIMATING',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  INVOICED = 'INVOICED',
  PAID = 'PAID',
  CANCELED = 'CANCELED',
}

export enum JobPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum EstimateStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  VOID = 'VOID',
}

export enum PaymentMethod {
  CASH = 'CASH',
  EMT = 'EMT',
  CREDIT = 'CREDIT',
  CHEQUE = 'CHEQUE',
  OTHER = 'OTHER',
}

export enum JobEventType {
  STATUS_CHANGE = 'STATUS_CHANGE',
  NOTE = 'NOTE',
  FILE_ADDED = 'FILE_ADDED',
  PAYMENT_RECORDED = 'PAYMENT_RECORDED',
}

// Valid job status transitions
export const JOB_STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  [JobStatus.LEAD]: [JobStatus.ESTIMATING, JobStatus.CANCELED],
  [JobStatus.ESTIMATING]: [JobStatus.APPROVED, JobStatus.LEAD, JobStatus.CANCELED],
  [JobStatus.APPROVED]: [JobStatus.SCHEDULED, JobStatus.ESTIMATING, JobStatus.CANCELED],
  [JobStatus.SCHEDULED]: [JobStatus.IN_PROGRESS, JobStatus.APPROVED, JobStatus.CANCELED],
  [JobStatus.IN_PROGRESS]: [JobStatus.COMPLETED, JobStatus.SCHEDULED],
  [JobStatus.COMPLETED]: [JobStatus.INVOICED],
  [JobStatus.INVOICED]: [JobStatus.PAID],
  [JobStatus.PAID]: [],
  [JobStatus.CANCELED]: [JobStatus.LEAD],
};

export function isValidStatusTransition(from: JobStatus, to: JobStatus): boolean {
  return JOB_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
