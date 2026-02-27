import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UserRole, User } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CreatePaymentSchema, CreatePaymentDto } from '@joblead/shared';

@Controller('invoices/:invoiceId/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get()
  findAll(@Param('invoiceId', ParseUUIDPipe) invoiceId: string) {
    return this.paymentsService.findByInvoice(invoiceId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @Body(new ZodValidationPipe(CreatePaymentSchema)) dto: CreatePaymentDto,
    @CurrentUser() user: User,
  ) {
    return this.paymentsService.create(invoiceId, dto, user.id);
  }
}
