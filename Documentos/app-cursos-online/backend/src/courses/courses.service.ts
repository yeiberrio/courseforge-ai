import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { YouTubeService } from '../youtube/youtube.service';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(
    private prisma: PrismaService,
    private youtubeService: YouTubeService,
    private kbService: KnowledgeBaseService,
  ) {}

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

  /**
   * Approve a course and trigger auto-publish to YouTube + KB ingestion.
   */
  async approveCourse(id: string, userId: string, userRole: string, options?: {
    publishToYoutube?: boolean;
    youtubePrivacy?: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  }) {
    const course = await this.findOne(id);

    if (userRole !== 'ADMIN' && course.creator_id !== userId) {
      throw new ForbiddenException('No tienes permiso para aprobar este curso');
    }

    // Update status to APPROVED
    const updated = await this.prisma.course.update({
      where: { id },
      data: {
        status: 'APPROVED',
        published_at: new Date(),
      },
    });

    const results: any = { courseId: id, status: 'APPROVED' };

    // Auto-ingest into knowledge base
    try {
      const kbResult = await this.kbService.ingestCourse(id);
      results.knowledgeBase = { ingested: true, chunks: kbResult.chunks };
      this.logger.log(`[Approve] Course ${id} ingested to KB: ${kbResult.chunks} chunks`);
    } catch (err) {
      this.logger.warn(`[Approve] KB ingestion failed: ${err.message}`);
      results.knowledgeBase = { ingested: false, error: err.message };
    }

    // Auto-publish to YouTube if requested
    if (options?.publishToYoutube !== false) {
      try {
        const ytResult = await this.youtubeService.autoPublishOnApproval({
          userId: course.creator_id,
          courseId: id,
          seoTitle: course.seo_title || course.title,
          seoDescription: course.seo_description || course.description_short || '',
          seoTags: course.seo_keywords?.split(',').map(t => t.trim()) || [],
          privacy: options?.youtubePrivacy || 'PUBLIC',
        });
        results.youtube = ytResult;
      } catch (err) {
        this.logger.warn(`[Approve] YouTube auto-publish failed: ${err.message}`);
        results.youtube = { published: false, error: err.message };
      }
    }

    return results;
  }
}
