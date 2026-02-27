import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole, JobStatus, JobEventType } from '@prisma/client';
import {
  CreateJobDto,
  UpdateJobDto,
  JobStatusUpdateDto,
  AddJobNoteDto,
  JobQueryDto,
  isValidStatusTransition,
  paginate,
} from '@joblead/shared';

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: JobQueryDto) {
    const { status, priority, customerId, startDateFrom, startDateTo, search, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (customerId) where.customerId = customerId;
    if (startDateFrom || startDateTo) {
      where.startDate = {};
      if (startDateFrom) (where.startDate as Record<string, unknown>).gte = new Date(startDateFrom);
      if (startDateTo) (where.startDate as Record<string, unknown>).lte = new Date(startDateTo);
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          address: { select: { id: true, street: true, city: true, province: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { estimates: true, invoices: true, files: true } },
        },
      }),
      this.prisma.job.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        customer: true,
        address: true,
        createdBy: { select: { id: true, name: true, role: true } },
        estimates: {
          orderBy: { versionNumber: 'desc' },
          include: { lineItems: true },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          include: { lineItems: true, payments: true },
        },
        events: {
          orderBy: { createdAt: 'desc' },
          include: { createdBy: { select: { id: true, name: true, role: true } } },
        },
        files: {
          orderBy: { createdAt: 'desc' },
          include: { uploadedBy: { select: { id: true, name: true } } },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  async create(dto: CreateJobDto, user: User) {
    const job = await this.prisma.job.create({
      data: {
        customerId: dto.customerId,
        addressId: dto.addressId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        depositRequired: dto.depositRequired,
        depositAmount: dto.depositAmount,
        createdByUserId: user.id,
      },
      include: {
        customer: { select: { id: true, name: true } },
        address: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Create initial JobEvent
    await this.prisma.jobEvent.create({
      data: {
        jobId: job.id,
        type: JobEventType.STATUS_CHANGE,
        message: `Job created with status LEAD`,
        toStatus: JobStatus.LEAD,
        createdByUserId: user.id,
      },
    });

    return job;
  }

  async update(id: string, dto: UpdateJobDto, user: User) {
    const job = await this.findOne(id);

    // CREW cannot edit jobs
    if (user.role === UserRole.CREW) {
      throw new ForbiddenException('Crew members cannot edit jobs');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.startDate !== undefined) updateData.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined) updateData.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.depositRequired !== undefined) updateData.depositRequired = dto.depositRequired;
    if (dto.depositAmount !== undefined) updateData.depositAmount = dto.depositAmount;
    if (dto.addressId !== undefined) updateData.addressId = dto.addressId;

    return this.prisma.job.update({
      where: { id, updatedAt: job.updatedAt }, // optimistic concurrency
      data: updateData,
      include: {
        customer: { select: { id: true, name: true } },
        address: true,
      },
    });
  }

  async updateStatus(id: string, dto: JobStatusUpdateDto, user: User) {
    const job = await this.findOne(id);

    if (user.role === UserRole.CREW) {
      throw new ForbiddenException('Crew members cannot change job status');
    }

    const fromStatus = job.status as JobStatus;
    const toStatus = dto.status;

    if (!isValidStatusTransition(fromStatus, toStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${fromStatus} to ${toStatus}`,
      );
    }

    const [updatedJob] = await this.prisma.$transaction([
      this.prisma.job.update({
        where: { id },
        data: { status: toStatus },
      }),
      this.prisma.jobEvent.create({
        data: {
          jobId: id,
          type: JobEventType.STATUS_CHANGE,
          message: dto.note || `Status changed from ${fromStatus} to ${toStatus}`,
          fromStatus,
          toStatus,
          createdByUserId: user.id,
        },
      }),
    ]);

    return updatedJob;
  }

  async addNote(id: string, dto: AddJobNoteDto, user: User) {
    await this.findOne(id);

    return this.prisma.jobEvent.create({
      data: {
        jobId: id,
        type: JobEventType.NOTE,
        message: dto.message,
        createdByUserId: user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });
  }

  async remove(id: string, user: User) {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete jobs');
    }
    await this.findOne(id);
    return this.prisma.job.delete({ where: { id } });
  }

  async getPaymentsSummary(jobId: string) {
    const job = await this.findOne(jobId);

    const invoices = await this.prisma.invoice.findMany({
      where: { jobId },
      include: { payments: true },
    });

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalCents, 0);
    const totalPaid = invoices.flatMap((inv) => inv.payments).reduce((sum, p) => sum + p.amountCents, 0);
    const outstanding = totalInvoiced - totalPaid;

    return {
      jobId,
      totalEstimateCents: job.totalEstimateCents,
      totalInvoiceCents: totalInvoiced,
      totalPaidCents: totalPaid,
      outstandingCents: outstanding,
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        totalCents: inv.totalCents,
        paidCents: inv.payments.reduce((sum, p) => sum + p.amountCents, 0),
        payments: inv.payments,
      })),
    };
  }

  async updateTotals(jobId: string) {
    // Recalculate totals from estimates and invoices
    const acceptedEstimate = await this.prisma.job_Estimate.findFirst({
      where: { jobId, status: 'ACCEPTED' },
      orderBy: { versionNumber: 'desc' },
    });

    const invoices = await this.prisma.invoice.findMany({
      where: { jobId, status: { not: 'VOID' } },
      include: { payments: true },
    });

    const totalEstimateCents = acceptedEstimate?.totalCents ?? 0;
    const totalInvoiceCents = invoices.reduce((sum, inv) => sum + inv.totalCents, 0);
    const totalPaidCents = invoices.flatMap((inv) => inv.payments).reduce((sum, p) => sum + p.amountCents, 0);

    return this.prisma.job.update({
      where: { id: jobId },
      data: { totalEstimateCents, totalInvoiceCents, totalPaidCents },
    });
  }
}
