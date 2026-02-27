// Types & Enums
export * from './types/enums';

// Schemas
export * from './schemas/auth.schemas';
export * from './schemas/user.schemas';
export * from './schemas/customer.schemas';
export * from './schemas/job.schemas';
export * from './schemas/estimate.schemas';
export * from './schemas/invoice.schemas';
export * from './schemas/pagination.schemas';

// Utility: cents to dollars display
export function centsToDisplay(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function calculateLineItemTotal(qty: number, unitPriceCents: number): number {
  return Math.round(qty * unitPriceCents);
}

export function calculateSubtotal(items: Array<{ totalCents: number }>): number {
  return items.reduce((sum, item) => sum + item.totalCents, 0);
}

export function calculateTax(subtotalCents: number, taxRate = 0.13): number {
  return Math.round(subtotalCents * taxRate);
}
