import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from '@prisma/client';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('jobs/:jobId/files')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Get()
  getFiles(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.filesService.getJobFiles(jobId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.filesService.uploadFile(jobId, file, user.id);
  }
}
