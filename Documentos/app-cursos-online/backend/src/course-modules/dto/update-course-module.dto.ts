import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ModuleStatus } from '@prisma/client';
import { CreateCourseModuleDto } from './create-course-module.dto';

export class UpdateCourseModuleDto extends PartialType(CreateCourseModuleDto) {
  @ApiPropertyOptional({ enum: ModuleStatus })
  @IsOptional()
  @IsEnum(ModuleStatus)
  status?: ModuleStatus;
}
