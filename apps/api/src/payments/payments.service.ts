import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { CreatePaymentDto } from '@joblead/shared';
import { InvoiceStatus, JobEventType, PaymentMethod } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private jobsService: JobsService,
  ) {}

  async create(invoiceId: string, dto: CreatePaymentDto, userId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException('Cannot record payment on a voided invoice');
    }

    const payment = await this.prisma.payment.create({
      data: {
        invoiceId,
        amountCents: dto.amountCents,
        method: dto.method as PaymentMethod,
        receivedAt: new Date(dto.receivedAt),
        notes: dto.notes,
      },
    });

    // Calculate total paid for this invoice
    const allPayments = [...invoice.payments, payment];
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amountCents, 0);

    // Update invoice status
    let newStatus = invoice.status;
    if (totalPaid >= invoice.totalCents) {
      newStatus = InvoiceStatus.PAID;
    } else if (totalPaid > 0) {
      newStatus = InvoiceStatus.PARTIAL;
    }

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: newStatus },
    });

    // Create job event
    const methodLabel = dto.method;
    const amountDisplay = `$${(dto.amountCents / 100).toFixed(2)}`;

    await this.prisma.jobEvent.create({
      data: {
        jobId: invoice.jobId,
        type: JobEventType.PAYMENT_RECORDED,
        message: `Payment of ${amountDisplay} received via ${methodLabel}.`,
        createdByUserId: userId,
      },
    });

    // Update job totals
    await this.jobsService.updateTotals(invoice.jobId);

    return payment;
  }

  async findByInvoice(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return this.prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { receivedAt: 'desc' },
    });
  }
}
