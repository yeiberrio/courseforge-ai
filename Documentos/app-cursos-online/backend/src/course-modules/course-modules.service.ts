import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';

@Injectable()
export class CourseModulesService {
  constructor(private prisma: PrismaService) {}

  async findByCourse(courseId: string) {
    return this.prisma.courseModule.findMany({
      where: { course_id: courseId },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string) {
    const mod = await this.prisma.courseModule.findUnique({
      where: { id },
      include: { course: { select: { id: true, title: true, creator_id: true } } },
    });
    if (!mod) throw new NotFoundException('Módulo no encontrado');
    return mod;
  }

  async create(dto: CreateCourseModuleDto) {
    return this.prisma.courseModule.create({ data: dto });
  }

  async update(id: string, dto: UpdateCourseModuleDto) {
    await this.findOne(id);
    return this.prisma.courseModule.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.courseModule.delete({ where: { id } });
    return { message: 'Módulo eliminado' };
  }
}
