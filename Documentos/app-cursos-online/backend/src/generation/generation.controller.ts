import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { GenerationService } from './generation.service';
import { TtsService } from './tts.service';
import { AvatarVideoService } from './avatar-video.service';
import { CurrentUser, Roles } from '../common/decorators';
import { UserRole } from '@prisma/client';
import { GenerateCourseDto } from './dto/generate-course.dto';
import { Logger } from '@nestjs/common';

@ApiTags('Generation')
@ApiBearerAuth()
@Controller('generation')
export class GenerationController {
  private readonly logger = new Logger(GenerationController.name);

  constructor(
    private generationService: GenerationService,
    private ttsService: TtsService,
    private avatarVideoService: AvatarVideoService,
  ) {}

  @Post('analyze-document')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir documento y analizar estructura del curso' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'documents'),
        filename: (_req, file, cb) => {
          const name = `${Date.now()}-${Math.random().toString(36).substring(2)}${extname(file.originalname)}`;
          cb(null, name);
        },
      }),
    }),
  )
  async analyzeDocument(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 })],
      }),
    )
    file: Express.Multer.File,
  ) {
    this.logger.log(`[analyze-document] File received: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`);
    try {
      const structure = await this.generationService.analyzeDocument(
        `uploads/documents/${file.filename}`,
      );
      this.logger.log(`[analyze-document] Success: "${structure.title}" with ${structure.modules.length} modules`);
      return {
        filePath: `uploads/documents/${file.filename}`,
        originalName: file.originalname,
        structure,
      };
    } catch (error) {
      this.logger.error(`[analyze-document] Failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('create-course')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear curso y generar contenido automáticamente' })
  async createCourse(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateCourseDto,
  ) {
    this.logger.log(`[create-course] User ${userId} starting course generation. File: ${dto.filePath}, Category: ${dto.categoryId}`);
    try {
      const result = await this.generationService.createCourseFromDocument(
        userId,
        dto.filePath,
        dto.categoryId,
        dto.voice,
        dto.slideStyle,
        dto.targetDurationMin,
        dto.videoType,
        dto.avatarId,
      );
      this.logger.log(`[create-course] Course created: ${result.course.id} - "${result.course.title}"`);
      return result;
    } catch (error) {
      this.logger.error(`[create-course] Failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('progress/:courseId')
  @ApiOperation({ summary: 'Obtener progreso de generación de un curso' })
  getProgress(@Param('courseId') courseId: string) {
    const progress = this.generationService.getProgress(courseId);
    return progress || { status: 'unknown', message: 'Sin información de progreso' };
  }

  @Get('voices')
  @ApiOperation({ summary: 'Listar voces disponibles (español)' })
  async listVoices() {
    return this.ttsService.listVoices();
  }

  @Get('avatars')
  @ApiOperation({ summary: 'Listar avatares disponibles para video con IA' })
  async listAvatars() {
    return {
      available: this.avatarVideoService.isAvailable(),
      avatars: await this.avatarVideoService.getAvatars(),
    };
  }
}
