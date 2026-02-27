import { PrismaClient, UserRole, JobStatus, JobPriority, EstimateStatus, InvoiceStatus, PaymentMethod, JobEventType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@joblead.ca' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@joblead.ca',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  // Create manager user
  const managerPassword = await bcrypt.hash('Manager123!', 12);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@joblead.ca' },
    update: {},
    create: {
      name: 'Jane Manager',
      email: 'manager@joblead.ca',
      passwordHash: managerPassword,
      role: UserRole.MANAGER,
    },
  });

  // Create crew user
  const crewPassword = await bcrypt.hash('Crew123!', 12);
  await prisma.user.upsert({
    where: { email: 'crew@joblead.ca' },
    update: {},
    create: {
      name: 'Bob Crew',
      email: 'crew@joblead.ca',
      passwordHash: crewPassword,
      role: UserRole.CREW,
    },
  });

  // Create demo customers
  const customer1 = await prisma.customer.create({
    data: {
      name: 'John Smith',
      phone: '416-555-0101',
      email: 'john.smith@example.com',
      companyName: null,
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: 'Sarah Johnson',
      phone: '905-555-0202',
      email: 'sarah.j@example.com',
      companyName: 'Johnson Properties Ltd.',
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      name: 'Mike Williams',
      phone: '647-555-0303',
      email: 'mike.w@example.com',
    },
  });

  // Create addresses
  const address1 = await prisma.address.create({
    data: {
      customerId: customer1.id,
      label: 'Home',
      street: '123 Maple Street',
      city: 'Toronto',
      province: 'ON',
      postalCode: 'M1A 1A1',
    },
  });

  const address2 = await prisma.address.create({
    data: {
      customerId: customer2.id,
      label: 'Rental Property',
      street: '456 Oak Avenue',
      city: 'Mississauga',
      province: 'ON',
      postalCode: 'L5A 2B2',
    },
  });

  const address3 = await prisma.address.create({
    data: {
      customerId: customer3.id,
      street: '789 Pine Road',
      city: 'Brampton',
      province: 'ON',
      postalCode: 'L6V 3C3',
    },
  });

  // Create demo jobs
  const job1 = await prisma.job.create({
    data: {
      customerId: customer1.id,
      addressId: address1.id,
      title: 'Basement Renovation',
      description: 'Complete basement finish including drywall, flooring, bathroom, and electrical.',
      status: JobStatus.IN_PROGRESS,
      priority: JobPriority.HIGH,
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-03-15'),
      depositRequired: true,
      depositAmount: 500000,
      totalEstimateCents: 2500000,
      totalInvoiceCents: 2500000,
      totalPaidCents: 500000,
      createdByUserId: manager.id,
    },
  });

  await prisma.jobEvent.create({
    data: {
      jobId: job1.id,
      type: JobEventType.STATUS_CHANGE,
      message: 'Job moved from LEAD to ESTIMATING',
      fromStatus: JobStatus.LEAD,
      toStatus: JobStatus.ESTIMATING,
      createdByUserId: manager.id,
    },
  });

  await prisma.jobEvent.create({
    data: {
      jobId: job1.id,
      type: JobEventType.STATUS_CHANGE,
      message: 'Estimate accepted. Moving to APPROVED.',
      fromStatus: JobStatus.ESTIMATING,
      toStatus: JobStatus.APPROVED,
      createdByUserId: admin.id,
    },
  });

  await prisma.jobEvent.create({
    data: {
      jobId: job1.id,
      type: JobEventType.STATUS_CHANGE,
      message: 'Job scheduled to start Feb 1.',
      fromStatus: JobStatus.APPROVED,
      toStatus: JobStatus.SCHEDULED,
      createdByUserId: admin.id,
    },
  });

  await prisma.jobEvent.create({
    data: {
      jobId: job1.id,
      type: JobEventType.STATUS_CHANGE,
      message: 'Work has started.',
      fromStatus: JobStatus.SCHEDULED,
      toStatus: JobStatus.IN_PROGRESS,
      createdByUserId: manager.id,
    },
  });

  // Create estimate for job1
  const estimate1 = await prisma.job_Estimate.create({
    data: {
      jobId: job1.id,
      versionNumber: 1,
      status: EstimateStatus.ACCEPTED,
      subtotalCents: 2212389,
      taxCents: 287611,
      totalCents: 2500000,
      notes: 'Includes all materials and labour. HST applied at 13%.',
      lineItems: {
        create: [
          { name: 'Framing & Drywall', qty: 1, unit: 'lot', unitPriceCents: 800000, totalCents: 800000 },
          { name: 'Flooring (LVP)', qty: 850, unit: 'sqft', unitPriceCents: 600, totalCents: 510000 },
          { name: 'Bathroom Rough-in', qty: 1, unit: 'lot', unitPriceCents: 450000, totalCents: 450000 },
          { name: 'Electrical', qty: 1, unit: 'lot', unitPriceCents: 350000, totalCents: 350000 },
          { name: 'Painting', description: '2 coats, all surfaces', qty: 1, unit: 'lot', unitPriceCents: 102389, totalCents: 102389 },
        ],
      },
    },
  });

  // Create invoice for job1
  const invoice1 = await prisma.invoice.create({
    data: {
      jobId: job1.id,
      invoiceNumber: 'INV-2024-001',
      status: InvoiceStatus.PARTIAL,
      subtotalCents: 2212389,
      taxCents: 287611,
      totalCents: 2500000,
      dueDate: new Date('2024-04-01'),
      lineItems: {
        create: [
          { name: 'Framing & Drywall', qty: 1, unit: 'lot', unitPriceCents: 800000, totalCents: 800000 },
          { name: 'Flooring (LVP)', qty: 850, unit: 'sqft', unitPriceCents: 600, totalCents: 510000 },
          { name: 'Bathroom Rough-in', qty: 1, unit: 'lot', unitPriceCents: 450000, totalCents: 450000 },
          { name: 'Electrical', qty: 1, unit: 'lot', unitPriceCents: 350000, totalCents: 350000 },
          { name: 'Painting', qty: 1, unit: 'lot', unitPriceCents: 102389, totalCents: 102389 },
        ],
      },
      payments: {
        create: [
          {
            amountCents: 500000,
            method: PaymentMethod.EMT,
            receivedAt: new Date('2024-02-01'),
            notes: 'Deposit payment',
          },
        ],
      },
    },
  });

  await prisma.jobEvent.create({
    data: {
      jobId: job1.id,
      type: JobEventType.PAYMENT_RECORDED,
      message: 'Deposit payment of $5,000.00 received via EMT.',
      createdByUserId: manager.id,
    },
  });

  // Job 2 - Lead
  const job2 = await prisma.job.create({
    data: {
      customerId: customer2.id,
      addressId: address2.id,
      title: 'Kitchen Remodel',
      description: 'Full kitchen renovation including new cabinets, countertops, and appliances.',
      status: JobStatus.ESTIMATING,
      priority: JobPriority.MEDIUM,
      depositRequired: false,
      totalEstimateCents: 0,
      totalInvoiceCents: 0,
      totalPaidCents: 0,
      createdByUserId: manager.id,
    },
  });

  await prisma.jobEvent.create({
    data: {
      jobId: job2.id,
      type: JobEventType.STATUS_CHANGE,
      message: 'Customer inquired about kitchen remodel.',
      fromStatus: JobStatus.LEAD,
      toStatus: JobStatus.ESTIMATING,
      createdByUserId: manager.id,
    },
  });

  // Draft estimate for job2
  await prisma.job_Estimate.create({
    data: {
      jobId: job2.id,
      versionNumber: 1,
      status: EstimateStatus.DRAFT,
      subtotalCents: 1769912,
      taxCents: 230088,
      totalCents: 2000000,
      notes: 'Draft estimate - pending final scope.',
      lineItems: {
        create: [
          { name: 'Cabinet Supply & Install', qty: 1, unit: 'lot', unitPriceCents: 900000, totalCents: 900000 },
          { name: 'Countertop (Quartz)', qty: 35, unit: 'sqft', unitPriceCents: 20000, totalCents: 700000 },
          { name: 'Labour', qty: 80, unit: 'hr', unitPriceCents: 9500, totalCents: 760000 },
          { name: 'Demo & Disposal', qty: 1, unit: 'lot', unitPriceCents: 109912, totalCents: 109912 },
        ],
      },
    },
  });

  // Job 3 - Lead
  const job3 = await prisma.job.create({
    data: {
      customerId: customer3.id,
      addressId: address3.id,
      title: 'Deck Construction',
      description: 'Build a 20x16 pressure treated deck with stairs.',
      status: JobStatus.LEAD,
      priority: JobPriority.LOW,
      depositRequired: false,
      totalEstimateCents: 0,
      totalInvoiceCents: 0,
      totalPaidCents: 0,
      createdByUserId: admin.id,
    },
  });

  await prisma.jobEvent.create({
    data: {
      jobId: job3.id,
      type: JobEventType.NOTE,
      message: 'Customer called to inquire. Interested in composite decking as upgrade.',
      createdByUserId: admin.id,
    },
  });

  // Job 4 - Completed/Paid
  const job4 = await prisma.job.create({
    data: {
      customerId: customer1.id,
      addressId: address1.id,
      title: 'Fence Installation',
      description: '6ft cedar fence, 120 linear feet.',
      status: JobStatus.PAID,
      priority: JobPriority.MEDIUM,
      startDate: new Date('2024-01-05'),
      endDate: new Date('2024-01-10'),
      depositRequired: false,
      totalEstimateCents: 450000,
      totalInvoiceCents: 450000,
      totalPaidCents: 450000,
      createdByUserId: manager.id,
    },
  });

  await prisma.jobEvent.create({
    data: {
      jobId: job4.id,
      type: JobEventType.STATUS_CHANGE,
      message: 'Job completed.',
      fromStatus: JobStatus.IN_PROGRESS,
      toStatus: JobStatus.COMPLETED,
      createdByUserId: manager.id,
    },
  });

  await prisma.jobEvent.create({
    data: {
      jobId: job4.id,
      type: JobEventType.STATUS_CHANGE,
      message: 'Invoice sent.',
      fromStatus: JobStatus.COMPLETED,
      toStatus: JobStatus.INVOICED,
      createdByUserId: manager.id,
    },
  });

  await prisma.jobEvent.create({
    data: {
      jobId: job4.id,
      type: JobEventType.STATUS_CHANGE,
      message: 'Payment received in full.',
      fromStatus: JobStatus.INVOICED,
      toStatus: JobStatus.PAID,
      createdByUserId: manager.id,
    },
  });

  const invoice4 = await prisma.invoice.create({
    data: {
      jobId: job4.id,
      invoiceNumber: 'INV-2024-002',
      status: InvoiceStatus.PAID,
      subtotalCents: 398230,
      taxCents: 51770,
      totalCents: 450000,
      lineItems: {
        create: [
          { name: 'Cedar Fence Materials', qty: 120, unit: 'lft', unitPriceCents: 2000, totalCents: 240000 },
          { name: 'Labour', qty: 40, unit: 'hr', unitPriceCents: 8500, totalCents: 340000 },
          { name: 'Disposal', qty: 1, unit: 'lot', unitPriceCents: -181770, totalCents: -181770 },
        ],
      },
      payments: {
        create: [
          {
            amountCents: 450000,
            method: PaymentMethod.CHEQUE,
            receivedAt: new Date('2024-01-15'),
            notes: 'Cheque #1042',
          },
        ],
      },
    },
  });

  console.log('✅ Seed complete!');
  console.log('');
  console.log('📋 Sample credentials:');
  console.log('  Admin:   admin@joblead.ca    / Admin123!');
  console.log('  Manager: manager@joblead.ca  / Manager123!');
  console.log('  Crew:    crew@joblead.ca     / Crew123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
