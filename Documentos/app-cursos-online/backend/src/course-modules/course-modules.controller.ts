import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CourseModulesService } from './course-modules.service';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';
import { Roles } from '../common/decorators';
import { UserRole } from '@prisma/client';

@ApiTags('Course Modules')
@ApiBearerAuth()
@Controller('course-modules')
export class CourseModulesController {
  constructor(private courseModulesService: CourseModulesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar módulos de un curso' })
  findByCourse(@Query('course_id') courseId: string) {
    return this.courseModulesService.findByCourse(courseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un módulo por ID' })
  findOne(@Param('id') id: string) {
    return this.courseModulesService.findOne(id);
  }

  @Post()
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear un módulo de curso' })
  create(@Body() dto: CreateCourseModuleDto) {
    return this.courseModulesService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar un módulo' })
  update(@Param('id') id: string, @Body() dto: UpdateCourseModuleDto) {
    return this.courseModulesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar un módulo' })
  remove(@Param('id') id: string) {
    return this.courseModulesService.remove(id);
  }
}
