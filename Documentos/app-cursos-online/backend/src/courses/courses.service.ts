import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async findAllPublished(page = 1, limit = 20, categoryId?: string) {
    const skip = (page - 1) * limit;
    const where: any = { status: 'PUBLISHED', deleted_at: null };
    if (categoryId) where.category_id = categoryId;

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        include: {
          creator: { select: { id: true, full_name: true, avatar_url: true } },
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { modules: true, enrollments: true } },
        },
        orderBy: { published_at: 'desc' },
      }),
      this.prisma.course.count({ where }),
    ]);

    return { data: courses, total, page, limit };
  }

  async findByCreator(creatorId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { creator_id: creatorId, deleted_at: null };

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true } },
          _count: { select: { modules: true, enrollments: true } },
        },
        orderBy: { updated_at: 'desc' },
      }),
      this.prisma.course.count({ where }),
    ]);

    return { data: courses, total, page, limit };
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, full_name: true, avatar_url: true } },
        category: true,
        modules: { orderBy: { order: 'asc' } },
        tags: true,
        _count: { select: { enrollments: true, purchases: true } },
      },
    });
    if (!course) throw new NotFoundException('Curso no encontrado');
    return course;
  }

  async findBySlug(slug: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      include: {
        creator: { select: { id: true, full_name: true, avatar_url: true } },
        category: true,
        modules: { orderBy: { order: 'asc' } },
        _count: { select: { enrollments: true } },
      },
    });
    if (!course) throw new NotFoundException('Curso no encontrado');
    return course;
  }

  async create(creatorId: string, dto: CreateCourseDto) {
    return this.prisma.course.create({
      data: {
        ...dto,
        creator_id: creatorId,
      },
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, userId: string, userRole: string, dto: UpdateCourseDto) {
    const course = await this.findOne(id);

    if (userRole !== 'ADMIN' && course.creator_id !== userId) {
      throw new ForbiddenException('No tienes permiso para editar este curso');
    }

    return this.prisma.course.update({
      where: { id },
      data: dto,
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string, userId: string, userRole: string) {
    const course = await this.findOne(id);

    if (userRole !== 'ADMIN' && course.creator_id !== userId) {
      throw new ForbiddenException('No tienes permiso para eliminar este curso');
    }

    await this.prisma.course.delete({ where: { id } });
    return { message: 'Curso eliminado' };
  }
}
