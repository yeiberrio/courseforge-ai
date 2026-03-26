import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EnrollmentsService } from './enrollments.service';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { CurrentUser } from '../common/decorators';

@ApiTags('Enrollments')
@ApiBearerAuth()
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private enrollmentsService: EnrollmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar mis inscripciones' })
  findMyEnrollments(@CurrentUser('id') studentId: string) {
    return this.enrollmentsService.findByStudent(studentId);
  }

  @Post(':courseId')
  @ApiOperation({ summary: 'Inscribirse a un curso' })
  enroll(
    @CurrentUser('id') studentId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.enrollmentsService.enroll(studentId, courseId);
  }

  @Post('progress')
  @ApiOperation({ summary: 'Actualizar progreso de un módulo' })
  updateProgress(
    @CurrentUser('id') studentId: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.enrollmentsService.updateProgress(studentId, dto);
  }

  @Get('progress/:courseId')
  @ApiOperation({ summary: 'Obtener progreso de un curso' })
  getProgress(
    @CurrentUser('id') studentId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.enrollmentsService.getProgress(studentId, courseId);
  }
}
