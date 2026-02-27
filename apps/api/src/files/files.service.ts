import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { JobEventType } from '@prisma/client';

@Injectable()
export class FilesService {
  constructor(
    private prisma: PrismaService,
    private jobsService: JobsService,
  ) {}

  async uploadFile(
    jobId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    await this.jobsService.findOne(jobId);

    const url = `/uploads/${file.filename}`;

    const fileRecord = await this.prisma.fileAttachment.create({
      data: {
        jobId,
        url,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedByUserId: userId,
      },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
    });

    await this.prisma.jobEvent.create({
      data: {
        jobId,
        type: JobEventType.FILE_ADDED,
        message: `File uploaded: ${file.originalname}`,
        createdByUserId: userId,
      },
    });

    return fileRecord;
  }

  async getJobFiles(jobId: string) {
    await this.jobsService.findOne(jobId);

    return this.prisma.fileAttachment.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
    });
  }
}
