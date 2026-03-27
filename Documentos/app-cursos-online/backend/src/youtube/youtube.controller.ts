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
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { YouTubeService } from './youtube.service';
import { CurrentUser, Roles, Public } from '../common/decorators';
import { UserRole } from '@prisma/client';

@ApiTags('YouTube')
@ApiBearerAuth()
@Controller('youtube')
export class YouTubeController {
  private readonly logger = new Logger(YouTubeController.name);

  constructor(private youtubeService: YouTubeService) {}

  @Get('auth-url')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener URL de autorización OAuth2 para conectar canal YouTube' })
  getAuthUrl(@CurrentUser('id') userId: string) {
    return {
      available: this.youtubeService.isAvailable(),
      url: this.youtubeService.isAvailable() ? this.youtubeService.getAuthUrl(userId) : null,
    };
  }

  @Get('callback')
  @Public()
  @ApiOperation({ summary: 'Callback OAuth2 de YouTube' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') userId: string,
    @Res() res: Response,
  ) {
    try {
      await this.youtubeService.handleCallback(code, userId);
      // Redirect to frontend with success
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      res.redirect(`${frontendUrl}/dashboard/youtube/canales?connected=true`);
    } catch (error) {
      this.logger.error(`YouTube callback failed: ${error.message}`);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      res.redirect(`${frontendUrl}/dashboard/youtube/conectar?error=${encodeURIComponent(error.message)}`);
    }
  }

  @Get('channels')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar canales YouTube conectados' })
  async getChannels(@CurrentUser('id') userId: string) {
    return this.youtubeService.getChannels(userId);
  }

  @Delete('channels/:id')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Desconectar canal YouTube' })
  async disconnectChannel(
    @Param('id') channelId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.youtubeService.disconnectChannel(channelId, userId);
  }

  @Post('publish')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Publicar video de curso en YouTube' })
  async publishVideo(
    @CurrentUser('id') userId: string,
    @Body() body: {
      courseId: string;
      moduleId?: string;
      channelDbId: string;
      title: string;
      description: string;
      tags: string[];
      privacy: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
      playlistId?: string;
      scheduledAt?: string;
      categoryId?: string;
    },
  ) {
    return this.youtubeService.publishVideo({
      userId,
      courseId: body.courseId,
      moduleId: body.moduleId,
      channelDbId: body.channelDbId,
      title: body.title,
      description: body.description,
      tags: body.tags || [],
      privacy: body.privacy || 'UNLISTED',
      playlistId: body.playlistId,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      categoryId: body.categoryId,
    });
  }

  @Get('publications/:courseId')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener publicaciones de YouTube para un curso' })
  async getPublications(@Param('courseId') courseId: string) {
    return this.youtubeService.getPublications(courseId);
  }

  @Get('subtitles/:moduleId')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Generar subtítulos SRT desde el guión del módulo' })
  async generateSubtitles(@Param('moduleId') moduleId: string) {
    const srt = await this.youtubeService.generateSubtitles(moduleId);
    return { srt };
  }
}
