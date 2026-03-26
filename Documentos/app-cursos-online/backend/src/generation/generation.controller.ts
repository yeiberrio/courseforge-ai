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
import { CurrentUser, Roles } from '../common/decorators';
import { UserRole } from '@prisma/client';
import { GenerateCourseDto } from './dto/generate-course.dto';

@ApiTags('Generation')
@ApiBearerAuth()
@Controller('generation')
export class GenerationController {
  constructor(
    private generationService: GenerationService,
    private ttsService: TtsService,
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
    const structure = await this.generationService.analyzeDocument(
      `uploads/documents/${file.filename}`,
    );
    return {
      filePath: `uploads/documents/${file.filename}`,
      originalName: file.originalname,
      structure,
    };
  }

  @Post('create-course')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear curso y generar contenido automáticamente' })
  async createCourse(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateCourseDto,
  ) {
    return this.generationService.createCourseFromDocument(
      userId,
      dto.filePath,
      dto.categoryId,
      dto.voice,
      dto.slideStyle,
      dto.targetDurationMin,
    );
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
}
