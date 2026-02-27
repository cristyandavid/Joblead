import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { EstimatesService } from './estimates.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateEstimateSchema,
  UpdateEstimateSchema,
  CreateEstimateDto,
  UpdateEstimateDto,
} from '@joblead/shared';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class EstimatesController {
  constructor(private estimatesService: EstimatesService) {}

  // Create estimate under a job
  @Post('jobs/:jobId/estimates')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body(new ZodValidationPipe(CreateEstimateSchema)) dto: CreateEstimateDto,
  ) {
    return this.estimatesService.create(jobId, dto);
  }

  @Get('estimates/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.estimatesService.findOne(id);
  }

  @Patch('estimates/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateEstimateSchema)) dto: UpdateEstimateDto,
  ) {
    return this.estimatesService.update(id, dto);
  }

  @Post('estimates/:id/send')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  send(@Param('id', ParseUUIDPipe) id: string) {
    return this.estimatesService.send(id);
  }

  @Post('estimates/:id/accept')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  accept(@Param('id', ParseUUIDPipe) id: string) {
    return this.estimatesService.accept(id);
  }

  @Post('estimates/:id/reject')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  reject(@Param('id', ParseUUIDPipe) id: string) {
    return this.estimatesService.reject(id);
  }
}
