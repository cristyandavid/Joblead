import { describe, it, expect } from 'vitest';
import {
  calculateLineItemTotal,
  calculateSubtotal,
  calculateTax,
  isValidStatusTransition,
  JobStatus,
  centsToDisplay,
} from '@joblead/shared';

describe('calculateLineItemTotal', () => {
  it('multiplies qty by unit price', () => {
    expect(calculateLineItemTotal(3, 10000)).toBe(30000);
  });

  it('handles fractional qty', () => {
    expect(calculateLineItemTotal(2.5, 10000)).toBe(25000);
  });

  it('rounds to nearest cent', () => {
    expect(calculateLineItemTotal(3, 3333)).toBe(9999);
  });

  it('returns 0 for zero qty', () => {
    expect(calculateLineItemTotal(0, 10000)).toBe(0);
  });
});

describe('calculateSubtotal', () => {
  it('sums all item totals', () => {
    const items = [{ totalCents: 10000 }, { totalCents: 20000 }, { totalCents: 5000 }];
    expect(calculateSubtotal(items)).toBe(35000);
  });

  it('returns 0 for empty array', () => {
    expect(calculateSubtotal([])).toBe(0);
  });
});

describe('calculateTax', () => {
  it('calculates 13% HST', () => {
    expect(calculateTax(100000)).toBe(13000);
  });

  it('rounds properly', () => {
    expect(calculateTax(100001)).toBe(13000);
  });

  it('supports custom tax rate', () => {
    expect(calculateTax(100000, 0.05)).toBe(5000);
  });
});

describe('centsToDisplay', () => {
  it('converts cents to dollar string', () => {
    expect(centsToDisplay(12345)).toBe('123.45');
    expect(centsToDisplay(100)).toBe('1.00');
    expect(centsToDisplay(0)).toBe('0.00');
  });
});

describe('isValidStatusTransition', () => {
  it('allows LEAD -> ESTIMATING', () => {
    expect(isValidStatusTransition(JobStatus.LEAD, JobStatus.ESTIMATING)).toBe(true);
  });

  it('allows ESTIMATING -> APPROVED', () => {
    expect(isValidStatusTransition(JobStatus.ESTIMATING, JobStatus.APPROVED)).toBe(true);
  });

  it('allows APPROVED -> SCHEDULED', () => {
    expect(isValidStatusTransition(JobStatus.APPROVED, JobStatus.SCHEDULED)).toBe(true);
  });

  it('allows SCHEDULED -> IN_PROGRESS', () => {
    expect(isValidStatusTransition(JobStatus.SCHEDULED, JobStatus.IN_PROGRESS)).toBe(true);
  });

  it('allows IN_PROGRESS -> COMPLETED', () => {
    expect(isValidStatusTransition(JobStatus.IN_PROGRESS, JobStatus.COMPLETED)).toBe(true);
  });

  it('allows COMPLETED -> INVOICED', () => {
    expect(isValidStatusTransition(JobStatus.COMPLETED, JobStatus.INVOICED)).toBe(true);
  });

  it('allows INVOICED -> PAID', () => {
    expect(isValidStatusTransition(JobStatus.INVOICED, JobStatus.PAID)).toBe(true);
  });

  it('disallows LEAD -> PAID (skipping steps)', () => {
    expect(isValidStatusTransition(JobStatus.LEAD, JobStatus.PAID)).toBe(false);
  });

  it('disallows PAID -> LEAD (backwards, unless via CANCELED)', () => {
    expect(isValidStatusTransition(JobStatus.PAID, JobStatus.LEAD)).toBe(false);
  });

  it('disallows IN_PROGRESS -> LEAD', () => {
    expect(isValidStatusTransition(JobStatus.IN_PROGRESS, JobStatus.LEAD)).toBe(false);
  });

  it('allows LEAD -> CANCELED', () => {
    expect(isValidStatusTransition(JobStatus.LEAD, JobStatus.CANCELED)).toBe(true);
  });

  it('allows CANCELED -> LEAD (re-open)', () => {
    expect(isValidStatusTransition(JobStatus.CANCELED, JobStatus.LEAD)).toBe(true);
  });

  it('disallows same status -> same status', () => {
    expect(isValidStatusTransition(JobStatus.LEAD, JobStatus.LEAD)).toBe(false);
  });
});
