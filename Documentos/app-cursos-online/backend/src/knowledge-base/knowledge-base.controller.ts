import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Res,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { KnowledgeBaseService } from './knowledge-base.service';
import { Roles } from '../common/decorators';
import { UserRole } from '@prisma/client';

@ApiTags('Knowledge Base')
@ApiBearerAuth()
@Controller('knowledge-base')
export class KnowledgeBaseController {
  private readonly logger = new Logger(KnowledgeBaseController.name);

  constructor(private kbService: KnowledgeBaseService) {}

  @Get()
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar documentos de la base de conocimiento' })
  async listDocuments(
    @Query('sourceType') sourceType?: string,
    @Query('category') category?: string,
  ) {
    return this.kbService.listDocuments({ sourceType, category });
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Estadísticas de la base de conocimiento' })
  async getStats() {
    return this.kbService.getStats();
  }

  @Get(':id')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Detalle de un documento de la base de conocimiento' })
  async getDocument(@Param('id') id: string) {
    return this.kbService.getDocument(id);
  }

  @Post('ingest/:courseId')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ingestar un curso en la base de conocimiento' })
  async ingestCourse(@Param('courseId') courseId: string) {
    return this.kbService.ingestCourse(courseId);
  }

  @Post('ingest-viral/:processingId')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ingestar contenido viral procesado en la base de conocimiento' })
  async ingestViralContent(@Param('processingId') processingId: string) {
    return this.kbService.ingestViralContent(processingId);
  }

  @Post('search')
  @Roles(UserRole.CREATOR, UserRole.ADMIN, UserRole.STUDENT)
  @ApiOperation({ summary: 'Búsqueda semántica en la base de conocimiento' })
  async search(@Body() body: { query: string; limit?: number }) {
    return this.kbService.search(body.query, body.limit || 5);
  }

  @Get(':id/download')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Descargar archivo de la base de conocimiento' })
  async downloadDocument(@Param('id') id: string, @Res() res: Response) {
    const { content, fileName } = await this.kbService.getDownloadContent(id);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(content);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Desactivar documento de la base de conocimiento' })
  async deactivateDocument(@Param('id') id: string) {
    return this.kbService.deactivateDocument(id);
  }
}
