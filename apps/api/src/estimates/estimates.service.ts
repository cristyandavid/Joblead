import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { CreateEstimateDto, UpdateEstimateDto, calculateLineItemTotal } from '@joblead/shared';
import { EstimateStatus } from '@prisma/client';

@Injectable()
export class EstimatesService {
  constructor(
    private prisma: PrismaService,
    private jobsService: JobsService,
  ) {}

  async create(jobId: string, dto: CreateEstimateDto) {
    await this.jobsService.findOne(jobId);

    // Get next version number
    const lastEstimate = await this.prisma.job_Estimate.findFirst({
      where: { jobId },
      orderBy: { versionNumber: 'desc' },
    });
    const versionNumber = (lastEstimate?.versionNumber ?? 0) + 1;

    // Calculate totals
    const lineItemsWithTotals = dto.lineItems.map((item) => ({
      ...item,
      totalCents: calculateLineItemTotal(item.qty, item.unitPriceCents),
    }));

    const subtotalCents = lineItemsWithTotals.reduce((sum, item) => sum + item.totalCents, 0);
    const taxCents = Math.round(subtotalCents * 0.13);
    const totalCents = subtotalCents + taxCents;

    const estimate = await this.prisma.job_Estimate.create({
      data: {
        jobId,
        versionNumber,
        status: EstimateStatus.DRAFT,
        subtotalCents,
        taxCents,
        totalCents,
        notes: dto.notes,
        lineItems: {
          create: lineItemsWithTotals,
        },
      },
      include: { lineItems: true },
    });

    return estimate;
  }

  async findOne(id: string) {
    const estimate = await this.prisma.job_Estimate.findUnique({
      where: { id },
      include: { lineItems: true },
    });

    if (!estimate) {
      throw new NotFoundException('Estimate not found');
    }

    return estimate;
  }

  async update(id: string, dto: UpdateEstimateDto) {
    const estimate = await this.findOne(id);

    if (estimate.status !== EstimateStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT estimates can be edited');
    }

    const updateData: Record<string, unknown> = {};

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

      // Delete existing line items and recreate
      await this.prisma.estimateLineItem.deleteMany({ where: { estimateId: id } });
      updateData.lineItems = { create: lineItemsWithTotals };
    }

    return this.prisma.job_Estimate.update({
      where: { id },
      data: updateData,
      include: { lineItems: true },
    });
  }

  async send(id: string) {
    const estimate = await this.findOne(id);

    if (estimate.status !== EstimateStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT estimates can be sent');
    }

    return this.prisma.job_Estimate.update({
      where: { id },
      data: { status: EstimateStatus.SENT },
      include: { lineItems: true },
    });
  }

  async accept(id: string) {
    const estimate = await this.findOne(id);

    if (estimate.status !== EstimateStatus.SENT && estimate.status !== EstimateStatus.DRAFT) {
      throw new BadRequestException('Only SENT or DRAFT estimates can be accepted');
    }

    const [updatedEstimate] = await this.prisma.$transaction([
      this.prisma.job_Estimate.update({
        where: { id },
        data: { status: EstimateStatus.ACCEPTED },
        include: { lineItems: true },
      }),
      // Reject all other estimates for this job
      this.prisma.job_Estimate.updateMany({
        where: {
          jobId: estimate.jobId,
          id: { not: id },
          status: { in: [EstimateStatus.DRAFT, EstimateStatus.SENT] },
        },
        data: { status: EstimateStatus.REJECTED },
      }),
    ]);

    // Update job totals
    await this.jobsService.updateTotals(estimate.jobId);

    return updatedEstimate;
  }

  async reject(id: string) {
    const estimate = await this.findOne(id);

    if (estimate.status !== EstimateStatus.SENT) {
      throw new BadRequestException('Only SENT estimates can be rejected');
    }

    return this.prisma.job_Estimate.update({
      where: { id },
      data: { status: EstimateStatus.REJECTED },
    });
  }
}
