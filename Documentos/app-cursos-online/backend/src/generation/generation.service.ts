import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScriptGeneratorService, CourseStructure, ModuleScript } from './script-generator.service';
import { TtsService } from './tts.service';
import { SlideService, SlideData } from './slide.service';
import { VideoAssemblyService } from './video-assembly.service';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export interface GenerationProgress {
  courseId: string;
  status: 'analyzing' | 'generating_scripts' | 'generating_audio' | 'generating_slides' | 'assembling_video' | 'done' | 'failed';
  currentModule: number;
  totalModules: number;
  message: string;
}

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);
  private progressMap = new Map<string, GenerationProgress>();

  constructor(
    private prisma: PrismaService,
    private scriptGenerator: ScriptGeneratorService,
    private tts: TtsService,
    private slides: SlideService,
    private videoAssembly: VideoAssemblyService,
  ) {}

  getProgress(courseId: string): GenerationProgress | null {
    return this.progressMap.get(courseId) || null;
  }

  /**
   * Step 1: Analyze uploaded document and propose course structure.
   */
  async analyzeDocument(filePath: string): Promise<CourseStructure> {
    const fullPath = join(process.cwd(), filePath);
    if (!existsSync(fullPath)) {
      throw new NotFoundException(`Archivo no encontrado: ${filePath}`);
    }

    const text = readFileSync(fullPath, 'utf-8');
    return this.scriptGenerator.analyzeCourseDocument(text);
  }

  /**
   * Step 2: Create course with modules from the analysis, then generate content.
   */
  async createCourseFromDocument(
    creatorId: string,
    filePath: string,
    categoryId: string,
    voice: string = 'es-CO-GonzaloNeural',
    slideStyle: 'minimal' | 'branded' | 'dark' = 'minimal',
    targetDurationMin: number = 5,
  ) {
    // 1. Analyze document
    const fullPath = join(process.cwd(), filePath);
    const text = readFileSync(fullPath, 'utf-8');
    const structure = await this.scriptGenerator.analyzeCourseDocument(text);

    // 2. Create course in DB
    const slug = structure.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 140);

    const course = await this.prisma.course.create({
      data: {
        creator_id: creatorId,
        category_id: categoryId,
        title: structure.title,
        slug: slug + '-' + Date.now().toString(36),
        description_short: structure.description,
        description_long: text.substring(0, 5000),
        status: 'GENERATING',
      },
    });

    // 3. Create modules
    for (let i = 0; i < structure.modules.length; i++) {
      await this.prisma.courseModule.create({
        data: {
          course_id: course.id,
          order: i + 1,
          title: structure.modules[i].title,
          status: 'PENDING',
        },
      });
    }

    // 4. Start generation in background
    this.generateCourseContent(course.id, text, structure, voice, slideStyle, targetDurationMin)
      .catch((error) => {
        this.logger.error(`Generation failed for course ${course.id}: ${error.message}`);
        this.updateProgress(course.id, 'failed', 0, 0, error.message);
      });

    return {
      course,
      structure,
      message: 'Curso creado. Generación de contenido iniciada en segundo plano.',
    };
  }

  /**
   * Background: Generate all module content (scripts, audio, slides, video).
   */
  private async generateCourseContent(
    courseId: string,
    documentText: string,
    structure: CourseStructure,
    voice: string,
    slideStyle: 'minimal' | 'branded' | 'dark',
    targetDurationMin: number,
  ) {
    const modules = await this.prisma.courseModule.findMany({
      where: { course_id: courseId },
      orderBy: { order: 'asc' },
    });

    const totalModules = modules.length;
    const outputBase = join(process.cwd(), 'uploads', 'generated', courseId);
    mkdirSync(outputBase, { recursive: true });

    // Split document text roughly per module
    const textChunks = this.splitTextForModules(documentText, totalModules);

    for (let i = 0; i < modules.length; i++) {
      const mod = modules[i];
      const moduleDir = join(outputBase, `module_${mod.order}`);
      mkdirSync(moduleDir, { recursive: true });

      try {
        // Update status
        this.updateProgress(courseId, 'generating_scripts', i + 1, totalModules, `Generando guión: ${mod.title}`);
        await this.prisma.courseModule.update({
          where: { id: mod.id },
          data: { status: 'GENERATING' },
        });

        // Generate script
        const moduleScript = await this.scriptGenerator.generateModuleScript(
          mod.title,
          textChunks[i] || '',
          targetDurationMin,
        );

        // Save script to DB
        await this.prisma.courseModule.update({
          where: { id: mod.id },
          data: { script: moduleScript.script },
        });

        // Generate audio
        this.updateProgress(courseId, 'generating_audio', i + 1, totalModules, `Generando audio: ${mod.title}`);
        const audioPath = join(moduleDir, 'audio.mp3');
        await this.tts.generateAudio({
          text: moduleScript.script,
          outputPath: audioPath,
          voice,
        });

        // Generate slides
        this.updateProgress(courseId, 'generating_slides', i + 1, totalModules, `Generando slides: ${mod.title}`);
        const slidesDir = join(moduleDir, 'slides');
        const slidesData: SlideData[] = moduleScript.slides.map((s, idx) => ({
          title: s.title,
          content: s.content,
          slideNumber: idx + 1,
          totalSlides: moduleScript.slides.length,
          courseTitle: structure.title,
        }));
        await this.slides.generateSlides(slidesData, slidesDir, slideStyle);

        // Assemble video
        this.updateProgress(courseId, 'assembling_video', i + 1, totalModules, `Ensamblando video: ${mod.title}`);
        const videoPath = join(moduleDir, 'video.mp4');

        try {
          await this.videoAssembly.assembleVideo({
            slidesDir,
            audioPath,
            outputPath: videoPath,
          });

          // Update module with video URL
          await this.prisma.courseModule.update({
            where: { id: mod.id },
            data: {
              video_url: `/uploads/generated/${courseId}/module_${mod.order}/video.mp4`,
              status: 'DONE',
              duration_seconds: moduleScript.estimatedDurationMin * 60,
            },
          });
        } catch (videoError) {
          // Video assembly failed (probably ffmpeg not installed), but audio + slides are ready
          this.logger.warn(`Video assembly failed for module ${mod.title}: ${videoError.message}. Audio and slides are available.`);
          await this.prisma.courseModule.update({
            where: { id: mod.id },
            data: {
              status: 'DONE',
              duration_seconds: moduleScript.estimatedDurationMin * 60,
            },
          });
        }

        // Create video job record
        await this.prisma.videoJob.create({
          data: {
            course_id: courseId,
            module_id: mod.id,
            status: 'DONE',
            config: { voice, slideStyle, targetDurationMin },
            assets: {
              audio: `/uploads/generated/${courseId}/module_${mod.order}/audio.mp3`,
              slides: `/uploads/generated/${courseId}/module_${mod.order}/slides/`,
              video: `/uploads/generated/${courseId}/module_${mod.order}/video.mp4`,
            },
            completed_at: new Date(),
          },
        });
      } catch (error) {
        this.logger.error(`Module ${mod.title} failed: ${error.message}`);
        await this.prisma.courseModule.update({
          where: { id: mod.id },
          data: { status: 'FAILED' },
        });
        await this.prisma.videoJob.create({
          data: {
            course_id: courseId,
            module_id: mod.id,
            status: 'FAILED',
            error_log: error.message,
          },
        });
      }
    }

    // Update course status
    const failedModules = await this.prisma.courseModule.count({
      where: { course_id: courseId, status: 'FAILED' },
    });

    await this.prisma.course.update({
      where: { id: courseId },
      data: { status: failedModules > 0 ? 'REVIEW' : 'REVIEW' },
    });

    this.updateProgress(courseId, 'done', totalModules, totalModules, 'Generación completada');
  }

  private updateProgress(
    courseId: string,
    status: GenerationProgress['status'],
    current: number,
    total: number,
    message: string,
  ) {
    this.progressMap.set(courseId, {
      courseId,
      status,
      currentModule: current,
      totalModules: total,
      message,
    });
  }

  private splitTextForModules(text: string, numModules: number): string[] {
    const paragraphs = text.split(/\n\n+/);
    const chunkSize = Math.ceil(paragraphs.length / numModules);
    const chunks: string[] = [];

    for (let i = 0; i < numModules; i++) {
      chunks.push(
        paragraphs.slice(i * chunkSize, (i + 1) * chunkSize).join('\n\n'),
      );
    }
    return chunks;
  }
}
