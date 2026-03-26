import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProgressDto } from './dto/update-progress.dto';

@Injectable()
export class EnrollmentsService {
  constructor(private prisma: PrismaService) {}

  async findByStudent(studentId: string) {
    return this.prisma.enrollment.findMany({
      where: { student_id: studentId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnail_url: true,
            _count: { select: { modules: true } },
          },
        },
      },
      orderBy: { enrolled_at: 'desc' },
    });
  }

  async enroll(studentId: string, courseId: string) {
    const existing = await this.prisma.enrollment.findUnique({
      where: { student_id_course_id: { student_id: studentId, course_id: courseId } },
    });
    if (existing) throw new ConflictException('Ya estás inscrito en este curso');

    return this.prisma.enrollment.create({
      data: { student_id: studentId, course_id: courseId },
      include: { course: { select: { id: true, title: true } } },
    });
  }

  async updateProgress(studentId: string, dto: UpdateProgressDto) {
    return this.prisma.moduleProgress.upsert({
      where: {
        student_id_module_id: {
          student_id: studentId,
          module_id: dto.module_id,
        },
      },
      update: {
        watched_seconds: dto.watched_seconds,
        completed: dto.completed,
        last_watched_at: new Date(),
      },
      create: {
        student_id: studentId,
        module_id: dto.module_id,
        watched_seconds: dto.watched_seconds,
        completed: dto.completed ?? false,
        last_watched_at: new Date(),
      },
    });
  }

  async getProgress(studentId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { student_id_course_id: { student_id: studentId, course_id: courseId } },
    });
    if (!enrollment) throw new NotFoundException('No estás inscrito en este curso');

    const modules = await this.prisma.courseModule.findMany({
      where: { course_id: courseId },
      orderBy: { order: 'asc' },
    });

    const progress = await this.prisma.moduleProgress.findMany({
      where: {
        student_id: studentId,
        module_id: { in: modules.map((m) => m.id) },
      },
    });

    const progressMap = new Map(progress.map((p) => [p.module_id, p]));

    return {
      enrollment,
      modules: modules.map((m) => ({
        ...m,
        progress: progressMap.get(m.id) || null,
      })),
      completed_count: progress.filter((p) => p.completed).length,
      total_modules: modules.length,
    };
  }
}
