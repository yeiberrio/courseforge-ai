import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Res,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
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
      minComments?: number;
      dateRange?: string;
      language?: string;
      languages?: string[];
      countries?: string[];
      eventType?: string;
      sortBy?: string;
      maxResults?: number;
    },
  ) {
    try {
      return await this.viralService.searchViral(userId, body);
    } catch (error) {
      this.logger.error(`Viral search failed: ${error.message}`);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error.message || 'Error al buscar contenido viral',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Get('categories')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener categorías disponibles para búsqueda viral' })
  async getCategories() {
    return this.viralService.getCategories();
  }

  @Get('date-ranges')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener rangos de fecha disponibles' })
  async getDateRanges() {
    return this.viralService.getDateRanges();
  }

  @Get('videos/:youtubeVideoId')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener video viral por YouTube video ID' })
  async getVideoByYoutubeId(@Param('youtubeVideoId') youtubeVideoId: string) {
    return this.viralService.getVideoByYoutubeId(youtubeVideoId);
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

  @Post('videos/:id/segments')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Extraer segmentos clave de un video usando IA' })
  async extractSegments(
    @Param('id') videoId: string,
    @Body() body: { transcription?: string },
  ) {
    try {
      return await this.viralService.extractSegments(videoId, body.transcription);
    } catch (error) {
      this.logger.error(`Extract segments failed: ${error.message}`);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error.message || 'Error al extraer segmentos del video',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Post('process')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Procesar transcripción con opciones avanzadas (tono, audiencia, objetivo)' })
  async processContent(
    @CurrentUser('id') userId: string,
    @Body() body: {
      viralVideoId: string;
      transcription: string;
      contentLength: ContentLength;
      language?: string;
      tone?: string;
      targetAudience?: string;
      contentGoal?: string;
      autoPublishYoutube?: boolean;
    },
  ) {
    try {
      return await this.viralService.processContent(userId, body);
    } catch (error) {
      this.logger.error(`Process content failed: ${error.message}`, error.stack);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error.message || 'Error al procesar contenido',
        HttpStatus.BAD_GATEWAY,
      );
    }
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

  @Post('export/sheets')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Exportar videos virales a Google Sheets (append al historial)' })
  async exportToGoogleSheets(
    @CurrentUser('id') userId: string,
    @Body() body: {
      videos: {
        videoId: string;
        title: string;
        channelTitle: string;
        viewCount: number;
        likeCount: number;
        commentCount?: number;
        engagementRate?: number;
        duration: string;
        publishedAt: string;
        category?: string;
      }[];
      category?: string;
    },
  ) {
    try {
      return await this.viralService.exportToGoogleSheets(userId, body.videos, body.category);
    } catch (error) {
      this.logger.error(`Google Sheets export failed: ${error.message}`);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error.message || 'Error al exportar a Google Sheets',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Post('export/excel')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Exportar videos virales seleccionados a Excel (.xlsx)' })
  async exportToExcel(
    @Body() body: {
      videos: {
        videoId: string;
        title: string;
        channelTitle: string;
        viewCount: number;
        likeCount: number;
        commentCount?: number;
        engagementRate?: number;
        duration: string;
        publishedAt: string;
        category?: string;
      }[];
      category?: string;
    },
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.viralService.exportToExcel(body.videos, body.category);
      const date = new Date().toISOString().split('T')[0];
      const filename = `contenido-viral-${body.category || 'todos'}-${date}.xlsx`;

      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.byteLength,
      });
      res.end(buffer);
    } catch (error) {
      this.logger.error(`Export failed: ${error.message}`);
      res.status(500).json({ message: error.message || 'Error al exportar a Excel' });
    }
  }
}
