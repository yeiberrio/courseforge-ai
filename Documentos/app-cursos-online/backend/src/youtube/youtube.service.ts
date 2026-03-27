import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { createReadStream, existsSync, statSync } from 'fs';
import { join } from 'path';

interface YouTubeTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

@Injectable()
export class YouTubeService {
  private readonly logger = new Logger(YouTubeService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly apiKey: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.clientId = this.configService.get<string>('YOUTUBE_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('YOUTUBE_CLIENT_SECRET') || '';
    this.redirectUri = this.configService.get<string>('YOUTUBE_REDIRECT_URI') || '';
    this.apiKey = this.configService.get<string>('YOUTUBE_API_KEY') || '';
  }

  isAvailable(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  isSearchAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Generate OAuth2 authorization URL for connecting a YouTube channel.
   */
  getAuthUrl(userId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube',
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: userId,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Handle OAuth2 callback — exchange code for tokens and store channel.
   */
  async handleCallback(code: string, userId: string) {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json().catch(() => ({}));
      throw new BadRequestException(`OAuth2 token exchange failed: ${error.error_description || tokenResponse.statusText}`);
    }

    const tokens: YouTubeTokens = await tokenResponse.json();

    // Get channel info
    const channelInfo = await this.getChannelInfo(tokens.access_token);

    // Store channel in DB
    const channel = await this.prisma.youTubeChannel.create({
      data: {
        user_id: userId,
        channel_id: channelInfo.id,
        channel_title: channelInfo.title,
        channel_thumbnail: channelInfo.thumbnail,
        access_token_encrypted: tokens.access_token,
        refresh_token_encrypted: tokens.refresh_token,
        token_expiry: new Date(tokens.expiry_date || Date.now() + 3600 * 1000),
        scopes: ['youtube.upload', 'youtube.readonly', 'youtube'],
        is_active: true,
      },
    });

    this.logger.log(`YouTube channel connected: ${channelInfo.title} (${channelInfo.id})`);
    return channel;
  }

  /**
   * Get connected YouTube channels for a user.
   */
  async getChannels(userId: string) {
    return this.prisma.youTubeChannel.findMany({
      where: { user_id: userId, is_active: true },
      select: {
        id: true,
        channel_id: true,
        channel_title: true,
        channel_thumbnail: true,
        connected_at: true,
        last_used_at: true,
      },
    });
  }

  /**
   * Disconnect a YouTube channel.
   */
  async disconnectChannel(channelId: string, userId: string) {
    const channel = await this.prisma.youTubeChannel.findFirst({
      where: { id: channelId, user_id: userId },
    });
    if (!channel) throw new NotFoundException('Canal no encontrado');

    await this.prisma.youTubeChannel.update({
      where: { id: channelId },
      data: { is_active: false },
    });

    return { message: 'Canal desconectado exitosamente' };
  }

  /**
   * Publish a course video to YouTube.
   */
  async publishVideo(options: {
    userId: string;
    courseId: string;
    moduleId?: string;
    channelDbId: string;
    title: string;
    description: string;
    tags: string[];
    privacy: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
    playlistId?: string;
    scheduledAt?: Date;
    categoryId?: string;
  }) {
    const { userId, courseId, moduleId, channelDbId, title, description, tags, privacy, playlistId, scheduledAt, categoryId } = options;

    // Get channel with tokens
    const channel = await this.prisma.youTubeChannel.findFirst({
      where: { id: channelDbId, user_id: userId, is_active: true },
    });
    if (!channel) throw new NotFoundException('Canal de YouTube no encontrado');

    // Get video file path
    let videoPath: string;
    if (moduleId) {
      const mod = await this.prisma.courseModule.findUnique({ where: { id: moduleId } });
      if (!mod?.video_url) throw new NotFoundException('Video del módulo no encontrado');
      videoPath = join(process.cwd(), mod.video_url);
    } else {
      // Find first module video
      const firstModule = await this.prisma.courseModule.findFirst({
        where: { course_id: courseId, status: 'DONE' },
        orderBy: { order: 'asc' },
      });
      if (!firstModule?.video_url) throw new NotFoundException('No se encontraron videos del curso');
      videoPath = join(process.cwd(), firstModule.video_url);
    }

    if (!existsSync(videoPath)) {
      throw new NotFoundException(`Archivo de video no encontrado: ${videoPath}`);
    }

    // Refresh token if needed
    const accessToken = await this.refreshAccessToken(channel);

    // Create publication record
    const publication = await this.prisma.youTubePublication.create({
      data: {
        course_id: courseId,
        module_id: moduleId || null,
        channel_id: channelDbId,
        privacy: privacy,
        scheduled_at: scheduledAt || null,
        status: 'UPLOADING',
        metadata: { title, description, tags, categoryId },
      },
    });

    // Upload video in background
    this.uploadToYouTube(publication.id, videoPath, accessToken, {
      title,
      description,
      tags,
      privacy: privacy.toLowerCase(),
      categoryId: categoryId || '27', // Education
      playlistId,
    }).catch((error) => {
      this.logger.error(`YouTube upload failed: ${error.message}`);
      this.prisma.youTubePublication.update({
        where: { id: publication.id },
        data: { status: 'FAILED', error_log: error.message },
      }).catch(() => {});
    });

    return {
      publication,
      message: 'Video en proceso de subida a YouTube.',
    };
  }

  /**
   * Get publications for a course.
   */
  async getPublications(courseId: string) {
    return this.prisma.youTubePublication.findMany({
      where: { course_id: courseId },
      include: {
        channel: {
          select: { channel_title: true, channel_thumbnail: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Generate SRT subtitles from a module's script.
   */
  async generateSubtitles(moduleId: string): Promise<string> {
    const mod = await this.prisma.courseModule.findUnique({ where: { id: moduleId } });
    if (!mod?.script) throw new NotFoundException('Script del módulo no encontrado');

    const words = mod.script.split(/\s+/);
    const wordsPerSegment = 15;
    const secondsPerSegment = 6;
    let srt = '';
    let index = 1;

    for (let i = 0; i < words.length; i += wordsPerSegment) {
      const segment = words.slice(i, i + wordsPerSegment).join(' ');
      const startSeconds = (i / wordsPerSegment) * secondsPerSegment;
      const endSeconds = startSeconds + secondsPerSegment;

      srt += `${index}\n`;
      srt += `${this.formatSrtTime(startSeconds)} --> ${this.formatSrtTime(endSeconds)}\n`;
      srt += `${segment}\n\n`;
      index++;
    }

    return srt;
  }

  // ─── Private helpers ──────────────────────────────────────────────

  private async getChannelInfo(accessToken: string): Promise<{ id: string; title: string; thumbnail: string }> {
    const response = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!response.ok) throw new Error('Failed to fetch channel info');

    const data = await response.json();
    const channel = data.items?.[0];
    if (!channel) throw new Error('No YouTube channel found for this account');

    return {
      id: channel.id,
      title: channel.snippet.title,
      thumbnail: channel.snippet.thumbnails?.default?.url || '',
    };
  }

  private async refreshAccessToken(channel: {
    id: string;
    refresh_token_encrypted: string | null;
    access_token_encrypted: string | null;
    token_expiry: Date | null;
  }): Promise<string> {
    // If token is still valid, return it
    if (channel.token_expiry && new Date(channel.token_expiry) > new Date()) {
      return channel.access_token_encrypted || '';
    }

    if (!channel.refresh_token_encrypted) {
      throw new Error('No refresh token available. Please reconnect your YouTube channel.');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: channel.refresh_token_encrypted,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) throw new Error('Failed to refresh YouTube access token');

    const tokens = await response.json();

    await this.prisma.youTubeChannel.update({
      where: { id: channel.id },
      data: {
        access_token_encrypted: tokens.access_token,
        token_expiry: new Date(Date.now() + (tokens.expires_in || 3600) * 1000),
        last_used_at: new Date(),
      },
    });

    return tokens.access_token;
  }

  private async uploadToYouTube(
    publicationId: string,
    videoPath: string,
    accessToken: string,
    metadata: {
      title: string;
      description: string;
      tags: string[];
      privacy: string;
      categoryId: string;
      playlistId?: string;
    },
  ) {
    const fileSize = statSync(videoPath).size;

    // Step 1: Initialize resumable upload
    const initResponse = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Length': fileSize.toString(),
          'X-Upload-Content-Type': 'video/mp4',
        },
        body: JSON.stringify({
          snippet: {
            title: metadata.title.substring(0, 100),
            description: metadata.description.substring(0, 5000),
            tags: metadata.tags.slice(0, 30),
            categoryId: metadata.categoryId,
            defaultLanguage: 'es',
          },
          status: {
            privacyStatus: metadata.privacy,
            selfDeclaredMadeForKids: false,
          },
        }),
      },
    );

    if (!initResponse.ok) {
      const err = await initResponse.json().catch(() => ({}));
      throw new Error(`YouTube upload init failed: ${JSON.stringify(err)}`);
    }

    const uploadUrl = initResponse.headers.get('location');
    if (!uploadUrl) throw new Error('YouTube did not return upload URL');

    // Step 2: Upload video bytes
    const fileBuffer = require('fs').readFileSync(videoPath);
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': fileSize.toString(),
        'Content-Type': 'video/mp4',
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      throw new Error(`YouTube video upload failed: ${uploadResponse.statusText}`);
    }

    const videoData = await uploadResponse.json();
    const youtubeVideoId = videoData.id;
    const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;

    this.logger.log(`Video uploaded to YouTube: ${youtubeUrl}`);

    // Update publication record
    await this.prisma.youTubePublication.update({
      where: { id: publicationId },
      data: {
        youtube_video_id: youtubeVideoId,
        youtube_url: youtubeUrl,
        status: 'PUBLISHED',
        published_at: new Date(),
      },
    });

    // Add to playlist if specified
    if (metadata.playlistId && youtubeVideoId) {
      await this.addToPlaylist(accessToken, metadata.playlistId, youtubeVideoId);
    }

    return { youtubeVideoId, youtubeUrl };
  }

  private async addToPlaylist(accessToken: string, playlistId: string, videoId: string) {
    try {
      await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: {
            playlistId,
            resourceId: { kind: 'youtube#video', videoId },
          },
        }),
      });
      this.logger.log(`Video ${videoId} added to playlist ${playlistId}`);
    } catch (error) {
      this.logger.warn(`Failed to add video to playlist: ${error.message}`);
    }
  }

  private formatSrtTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }
}
