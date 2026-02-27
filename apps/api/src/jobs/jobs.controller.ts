import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserRole, User } from '@prisma/client';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateJobSchema,
  UpdateJobSchema,
  JobStatusUpdateSchema,
  AddJobNoteSchema,
  JobQuerySchema,
  CreateJobDto,
  UpdateJobDto,
  JobStatusUpdateDto,
  AddJobNoteDto,
  JobQueryDto,
} from '@joblead/shared';

@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobsController {
  constructor(private jobsService: JobsService) {}

  @Get()
  findAll(
    @Query(new ZodValidationPipe(JobQuerySchema)) query: JobQueryDto,
  ) {
    return this.jobsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(
    @Body(new ZodValidationPipe(CreateJobSchema)) dto: CreateJobDto,
    @CurrentUser() user: User,
  ) {
    return this.jobsService.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateJobSchema)) dto: UpdateJobDto,
    @CurrentUser() user: User,
  ) {
    return this.jobsService.update(id, dto, user);
  }

  @Post(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(JobStatusUpdateSchema)) dto: JobStatusUpdateDto,
    @CurrentUser() user: User,
  ) {
    return this.jobsService.updateStatus(id, dto, user);
  }

  @Post(':id/notes')
  addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(AddJobNoteSchema)) dto: AddJobNoteDto,
    @CurrentUser() user: User,
  ) {
    return this.jobsService.addNote(id, dto, user);
  }

  @Get(':id/payments')
  getPaymentsSummary(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.getPaymentsSummary(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.jobsService.remove(id, user);
  }
}
