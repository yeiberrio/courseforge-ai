import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ViralService } from './viral.service';
import { CurrentUser, Roles } from '../common/decorators';
import { UserRole, ViralCategory, ContentLength } from '@prisma/client';

@ApiTags('Viral')
@ApiBearerAuth()
@Controller('viral')
export class ViralController {
  private readonly logger = new Logger(ViralController.name);

  constructor(private viralService: ViralService) {}

  @Post('search')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Buscar videos virales en YouTube con filtros' })
  async searchViral(
    @CurrentUser('id') userId: string,
    @Body() body: {
      category: ViralCategory;
      keywords?: string[];
      minViews?: number;
      minLikes?: number;
      dateRange?: string;
      language?: string;
      maxResults?: number;
    },
  ) {
    return this.viralService.searchViral(userId, body);
  }

  @Get('search/:id/results')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener resultados de una búsqueda viral' })
  async getSearchResults(@Param('id') searchId: string) {
    return this.viralService.getSearchResults(searchId);
  }

  @Post('videos/:id/select')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Marcar video como interesante' })
  async selectVideo(@Param('id') videoId: string) {
    return this.viralService.selectVideo(videoId);
  }

  @Post('videos/:id/transcribe')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Transcribir video viral' })
  async transcribeVideo(@Param('id') videoId: string) {
    return this.viralService.transcribeVideo(videoId);
  }

  @Post('process')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Procesar transcripción y generar contenido original con Claude' })
  async processContent(
    @CurrentUser('id') userId: string,
    @Body() body: {
      viralVideoId: string;
      transcription: string;
      contentLength: ContentLength;
      language?: string;
    },
  ) {
    return this.viralService.processContent(userId, body);
  }

  @Put('process/:id/length')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cambiar extensión del contenido y reprocesar' })
  async updateContentLength(
    @Param('id') processingId: string,
    @Body() body: { contentLength: ContentLength },
  ) {
    return this.viralService.updateContentLength(processingId, body.contentLength);
  }

  @Get('process/:id/preview')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Preview del documento generado' })
  async getProcessingPreview(@Param('id') processingId: string) {
    return this.viralService.getProcessingPreview(processingId);
  }

  @Get('trending')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Top 10 videos virales del día por categoría' })
  async getTrending() {
    return this.viralService.getTrending();
  }

  @Get('history')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Historial de búsquedas virales del usuario' })
  async getHistory(@CurrentUser('id') userId: string) {
    return this.viralService.getHistory(userId);
  }
}
