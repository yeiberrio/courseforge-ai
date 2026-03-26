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
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Public, Roles, CurrentUser } from '../common/decorators';
import { UserRole } from '@prisma/client';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private coursesService: CoursesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar cursos publicados (público)' })
  findAllPublished(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category_id') categoryId?: string,
  ) {
    return this.coursesService.findAllPublished(page || 1, limit || 20, categoryId);
  }

  @Get('my-courses')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar mis cursos (creador)' })
  findMyCourses(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.coursesService.findByCreator(userId, page || 1, limit || 20);
  }

  @Public()
  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Obtener curso por slug (público)' })
  findBySlug(@Param('slug') slug: string) {
    return this.coursesService.findBySlug(slug);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener curso por ID' })
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Post()
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear un curso (creador)' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateCourseDto) {
    return this.coursesService.create(userId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar un curso' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.coursesService.update(id, userId, userRole, dto);
  }

  @Delete(':id')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar un curso (soft delete)' })
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.coursesService.remove(id, userId, userRole);
  }
}
