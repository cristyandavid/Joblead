import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { CreateInvoiceDto, UpdateInvoiceDto, calculateLineItemTotal } from '@joblead/shared';
import { InvoiceStatus } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private jobsService: JobsService,
  ) {}

  async create(jobId: string, dto: CreateInvoiceDto) {
    await this.jobsService.findOne(jobId);

    // Generate invoice number
    const count = await this.prisma.invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const lineItemsWithTotals = dto.lineItems.map((item) => ({
      ...item,
      totalCents: calculateLineItemTotal(item.qty, item.unitPriceCents),
    }));

    const subtotalCents = lineItemsWithTotals.reduce((sum, item) => sum + item.totalCents, 0);
    const taxCents = Math.round(subtotalCents * 0.13);
    const totalCents = subtotalCents + taxCents;

    const invoice = await this.prisma.invoice.create({
      data: {
        jobId,
        invoiceNumber,
        subtotalCents,
        taxCents,
        totalCents,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes,
        lineItems: { create: lineItemsWithTotals },
      },
      include: { lineItems: true, payments: true },
    });

    await this.jobsService.updateTotals(jobId);

    return invoice;
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { lineItems: true, payments: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    const invoice = await this.findOne(id);

    if (invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException('Cannot edit a voided invoice');
    }

    const updateData: Record<string, unknown> = {};

    if (dto.dueDate !== undefined) updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    if (dto.lineItems) {
      const lineItemsWithTotals = dto.lineItems.map((item) => ({
        ...item,
        totalCents: calculateLineItemTotal(item.qty, item.unitPriceCents),
      }));

      const subtotalCents = lineItemsWithTotals.reduce((sum, item) => sum + item.totalCents, 0);
      const taxCents = Math.round(subtotalCents * 0.13);
      const totalCents = subtotalCents + taxCents;

      updateData.subtotalCents = subtotalCents;
      updateData.taxCents = taxCents;
      updateData.totalCents = totalCents;

      await this.prisma.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
      updateData.lineItems = { create: lineItemsWithTotals };
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: { lineItems: true, payments: true },
    });

    await this.jobsService.updateTotals(invoice.jobId);

    return updated;
  }

  async send(id: string) {
    const invoice = await this.findOne(id);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT invoices can be sent');
    }

    return this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.SENT },
    });
  }

  async void(id: string) {
    const invoice = await this.findOne(id);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot void a fully paid invoice');
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.VOID },
    });

    await this.jobsService.updateTotals(invoice.jobId);

    return updated;
  }
}
