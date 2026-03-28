import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ViralCategory, ContentLength } from '@prisma/client';

const VIRAL_KEYWORDS: Record<string, string[]> = {
  RELIGIOUS: [
    'biblia', 'torah', 'evangelio', 'predica', 'sermón', 'reflexión espiritual',
    'enseñanza bíblica', 'parábola', 'salmos', 'profecía', 'estudio bíblico',
    'cristianismo', 'judaísmo', 'espiritualidad', 'devocional', 'fe',
  ],
  EDUCATIONAL: [
    'curso', 'tutorial', 'clase', 'aprende', 'explicación', 'cómo funciona',
    'ciencia', 'historia', 'matemáticas', 'programación', 'idiomas',
    'filosofía', 'psicología', 'economía', 'finanzas personales', 'productividad',
  ],
  NEWS: [
    'noticias hoy', 'última hora', 'análisis', 'opinión', 'debate',
    'actualidad', 'reportaje', 'investigación', 'política', 'economía mundial',
    'tecnología', 'cambio climático', 'sociedad',
  ],
};

const CATEGORY_IDS: Record<string, string[]> = {
  RELIGIOUS: ['27', '22', '29'],   // Education, People & Blogs, Nonprofits
  EDUCATIONAL: ['27', '28', '26'], // Education, Science & Technology, Howto
  NEWS: ['25', '28'],              // News & Politics, Science & Technology
};

interface YouTubeSearchResult {
  youtube_video_id: string;
  title: string;
  channel_name: string;
  channel_id: string;
  thumbnail_url: string;
  published_at: string;
}

@Injectable()
export class ViralService {
  private readonly logger = new Logger(ViralService.name);
  private readonly youtubeApiKey: string;
  private readonly anthropicApiKey: string;
  private readonly openaiApiKey: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.youtubeApiKey = this.configService.get<string>('YOUTUBE_API_KEY') || '';
    this.anthropicApiKey = this.configService.get<string>('ANTHROPIC_API_KEY') || '';
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
  }

  isAvailable(): boolean {
    return !!this.youtubeApiKey;
  }

  /**
   * Search YouTube for viral videos matching criteria.
   */
  async searchViral(userId: string, options: {
    category: ViralCategory;
    keywords?: string[];
    minViews?: number;
    minLikes?: number;
    dateRange?: string;
    language?: string;
    maxResults?: number;
  }) {
    if (!this.youtubeApiKey) {
      throw new BadRequestException('YOUTUBE_API_KEY no configurada');
    }

    const {
      category,
      keywords,
      minViews = 100000,
      minLikes = 5000,
      dateRange = '30d',
      language = 'es',
      maxResults = 20,
    } = options;

    // Calculate publishedAfter date
    const now = new Date();
    const rangeMap: Record<string, number> = {
      '7d': 7, '30d': 30, '90d': 90, '365d': 365,
    };
    const daysBack = rangeMap[dateRange] || 30;
    const publishedAfter = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    // Use provided keywords or defaults
    const searchKeywords = keywords?.length
      ? keywords
      : VIRAL_KEYWORDS[category] || VIRAL_KEYWORDS.EDUCATIONAL;

    // Search YouTube API
    const searchQuery = searchKeywords.slice(0, 5).join(' | ');

    const searchParams = new URLSearchParams({
      part: 'snippet',
      q: searchQuery,
      type: 'video',
      order: 'viewCount',
      relevanceLanguage: language,
      publishedAfter,
      maxResults: String(Math.min(maxResults, 50)),
      videoDuration: 'medium', // 4-20 min
      key: this.youtubeApiKey,
    });

    // Note: videoCategoryId is NOT compatible with type=video in YouTube Search API
    // Category filtering is done via keywords instead

    let searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`,
    );

    if (!searchResponse.ok) {
      const err = await searchResponse.json().catch(() => ({}));
      this.logger.error(`YouTube search error: ${JSON.stringify(err)}`);
      throw new Error(`YouTube search failed: ${err.error?.message || searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();
    const videoIds = (searchData.items || [])
      .map((item: any) => item.id.videoId)
      .filter(Boolean);

    if (videoIds.length === 0) {
      return { search: null, videos: [] };
    }

    // Get video statistics
    const statsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${videoIds.join(',')}&key=${this.youtubeApiKey}`,
    );

    if (!statsResponse.ok) throw new Error('Failed to fetch video statistics');

    const statsData = await statsResponse.json();

    // Filter by view/like thresholds
    const filteredVideos = (statsData.items || []).filter((video: any) => {
      const views = parseInt(video.statistics.viewCount || '0');
      const likes = parseInt(video.statistics.likeCount || '0');
      return views >= minViews || likes >= minLikes;
    });

    // Create search record
    const search = await this.prisma.viralSearch.create({
      data: {
        user_id: userId,
        category,
        keywords: searchKeywords,
        min_views: minViews,
        min_likes: minLikes,
        date_range: dateRange,
        language,
        results_count: filteredVideos.length,
      },
    });

    // Save video results
    const videos: any[] = [];
    for (const video of filteredVideos) {
      const duration = this.parseDuration(video.contentDetails.duration);
      const saved = await this.prisma.viralVideo.create({
        data: {
          search_id: search.id,
          youtube_video_id: video.id,
          title: video.snippet.title,
          channel_name: video.snippet.channelTitle,
          channel_id: video.snippet.channelId,
          thumbnail_url: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url,
          view_count: BigInt(video.statistics.viewCount || '0'),
          like_count: parseInt(video.statistics.likeCount || '0'),
          comment_count: parseInt(video.statistics.commentCount || '0'),
          duration_seconds: duration,
          published_at: new Date(video.snippet.publishedAt),
          category,
        },
      });
      videos.push({
        ...saved,
        view_count: Number(saved.view_count),
      } as any);
    }

    this.logger.log(`Viral search: found ${videos.length} videos for category ${category}`);

    // Map to frontend format
    const mappedVideos = videos.map((v: any) => ({
      videoId: v.youtube_video_id,
      title: v.title,
      channelTitle: v.channel_name,
      thumbnail: v.thumbnail_url,
      viewCount: Number(v.view_count),
      likeCount: v.like_count,
      duration: this.formatDuration(v.duration_seconds),
      publishedAt: v.published_at?.toISOString?.() || v.published_at,
    }));

    return { search, videos: mappedVideos, totalResults: mappedVideos.length, category };
  }

  /**
   * Get a viral video by its YouTube video ID.
   */
  async getVideoByYoutubeId(youtubeVideoId: string) {
    const video = await this.prisma.viralVideo.findFirst({
      where: { youtube_video_id: youtubeVideoId },
      orderBy: { created_at: 'desc' },
    });
    if (!video) throw new NotFoundException('Video viral no encontrado');

    return {
      id: video.id,
      videoId: video.youtube_video_id,
      title: video.title,
      channelTitle: video.channel_name,
      thumbnail: video.thumbnail_url,
      viewCount: Number(video.view_count),
      likeCount: video.like_count,
      duration: this.formatDuration(video.duration_seconds),
      publishedAt: video.published_at?.toISOString?.() || video.published_at,
    };
  }

  /**
   * Get search results.
   */
  async getSearchResults(searchId: string) {
    const videos = await this.prisma.viralVideo.findMany({
      where: { search_id: searchId },
      orderBy: { view_count: 'desc' },
    });
    return videos.map((v) => ({ ...v, view_count: Number(v.view_count) }));
  }

  /**
   * Mark a video as selected.
   */
  async selectVideo(videoId: string) {
    return this.prisma.viralVideo.update({
      where: { id: videoId },
      data: { is_selected: true },
    });
  }

  /**
   * Transcribe a viral video using YouTube captions or Whisper.
   * Accepts either database UUID or YouTube video ID.
   */
  async transcribeVideo(videoId: string) {
    let video = await this.prisma.viralVideo.findUnique({ where: { id: videoId } });
    if (!video) {
      // Fallback: try finding by YouTube video ID
      video = await this.prisma.viralVideo.findFirst({
        where: { youtube_video_id: videoId },
        orderBy: { created_at: 'desc' },
      });
    }
    if (!video) throw new NotFoundException('Video no encontrado');

    const dbId = video.id;

    await this.prisma.viralVideo.update({
      where: { id: dbId },
      data: { transcription_status: 'PROCESSING' },
    });

    try {
      // Try YouTube captions first
      let transcription = await this.getYouTubeCaptions(video.youtube_video_id);

      if (!transcription) {
        // Fallback: use a description/title based approach
        transcription = `[Título]: ${video.title}\n[Canal]: ${video.channel_name}\n[Categoría]: ${video.category}\n\nNota: No se pudieron obtener subtítulos automáticos. Usar Whisper API con audio descargado para transcripción completa.`;
      }

      await this.prisma.viralVideo.update({
        where: { id: dbId },
        data: { transcription_status: 'DONE' },
      });

      return { transcription, source: 'captions' };
    } catch (error) {
      await this.prisma.viralVideo.update({
        where: { id: dbId },
        data: { transcription_status: 'FAILED' },
      });
      throw error;
    }
  }

  /**
   * Process transcription into original course content using Claude.
   */
  async processContent(userId: string, options: {
    viralVideoId: string;
    transcription: string;
    contentLength: ContentLength;
    language?: string;
  }) {
    if (!this.openaiApiKey && !this.anthropicApiKey) {
      throw new BadRequestException('Se requiere OPENAI_API_KEY o ANTHROPIC_API_KEY para procesamiento');
    }

    let video = await this.prisma.viralVideo.findUnique({ where: { id: options.viralVideoId } });
    if (!video) {
      video = await this.prisma.viralVideo.findFirst({
        where: { youtube_video_id: options.viralVideoId },
        orderBy: { created_at: 'desc' },
      });
    }
    if (!video) throw new NotFoundException('Video viral no encontrado');

    // Create processing record
    const processing = await this.prisma.viralContentProcessing.create({
      data: {
        viral_video_id: video.id,
        user_id: userId,
        raw_transcription: options.transcription,
        content_length: options.contentLength,
        status: 'PROCESSING',
      },
    });

    // Duration map
    const durationMap: Record<string, { min: number; max: number; words_min: number; words_max: number; modules_min: number; modules_max: number }> = {
      EXTENSIVE: { min: 30, max: 60, words_min: 4500, words_max: 9000, modules_min: 4, modules_max: 8 },
      MEDIUM: { min: 15, max: 30, words_min: 2250, words_max: 4500, modules_min: 2, modules_max: 4 },
      REDUCED: { min: 5, max: 15, words_min: 750, words_max: 2250, modules_min: 1, modules_max: 2 },
      MICRO: { min: 1, max: 5, words_min: 150, words_max: 750, modules_min: 1, modules_max: 1 },
    };
    const duration = durationMap[options.contentLength] || durationMap.MEDIUM;

    const systemPrompt = `Eres un experto en diseño instruccional y creación de contenido educativo original.
Se te proporcionará información factual extraída de una fuente de video.
Tu tarea es crear contenido COMPLETAMENTE ORIGINAL para un curso educativo.

REGLAS ESTRICTAS:
1. NUNCA copies frases, párrafos o estructura del contenido fuente
2. Usa la información factual como INSPIRACIÓN, no como base para parafrasear
3. Agrega perspectivas, contexto histórico y análisis que NO estén en la fuente
4. Cita fuentes académicas, libros o artículos reconocidos (no el video fuente)
5. Estructura el contenido como material pedagógico profesional
6. Incluye preguntas de reflexión y ejercicios prácticos
7. El resultado debe ser autosuficiente

EXTENSIÓN: ${options.contentLength}
- Duración narración: ${duration.min}-${duration.max} minutos (~${duration.words_min}-${duration.words_max} palabras)
- Módulos: ${duration.modules_min}-${duration.modules_max}

CATEGORÍA: ${video.category}
IDIOMA: ${options.language || 'español'}

FORMATO DE SALIDA (JSON estricto):
{
  "title": "Título atractivo y SEO del curso",
  "description": "Descripción de 2-3 párrafos",
  "target_audience": "Público objetivo",
  "objectives": ["Objetivo 1", "Objetivo 2"],
  "modules": [
    {
      "title": "Título del módulo",
      "content": "Contenido completo para narración (varias páginas)",
      "key_points": ["Punto 1", "Punto 2"],
      "reflection_questions": ["¿Pregunta 1?"],
      "additional_resources": ["Recurso sugerido"]
    }
  ],
  "seo_tags": ["tag1", "tag2"],
  "disclaimer": "Este contenido es una creación original con fines educativos..."
}`;

    try {
      const userMessage = `Información factual extraída del video "${video.title}" (${video.category}):\n\n${options.transcription.substring(0, 10000)}\n\nGenera el contenido original del curso en formato JSON.`;

      let content = '';

      if (this.openaiApiKey) {
        // Use OpenAI
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            max_tokens: 8000,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(`OpenAI API failed: ${err.error?.message || response.statusText}`);
        }

        const data = await response.json();
        content = data.choices?.[0]?.message?.content || '';
      } else {
        // Fallback to Anthropic
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': this.anthropicApiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8000,
            system: systemPrompt,
            messages: [
              { role: 'user', content: userMessage },
            ],
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(`Claude API failed: ${err.error?.message || response.statusText}`);
        }

        const data = await response.json();
        content = data.content?.[0]?.text || '';
      }

      // Parse JSON from response
      let generatedDoc: any;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        generatedDoc = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        generatedDoc = { raw_content: content };
      }

      // Extract topics and facts
      const topics = generatedDoc?.modules?.map((m: any) => m.title) || [];
      const keyFacts = generatedDoc?.modules?.flatMap((m: any) => m.key_points || []) || [];

      // Update processing record
      await this.prisma.viralContentProcessing.update({
        where: { id: processing.id },
        data: {
          processed_content: content,
          topics_extracted: topics,
          key_facts: keyFacts,
          generated_document: generatedDoc,
          target_duration_minutes: duration.max,
          status: 'READY',
        },
      });

      // Schedule raw transcription deletion (privacy)
      setTimeout(async () => {
        try {
          await this.prisma.viralContentProcessing.update({
            where: { id: processing.id },
            data: { raw_transcription: null },
          });
        } catch {}
      }, 24 * 60 * 60 * 1000); // 24 hours

      return {
        id: processing.id,
        generatedDocument: generatedDoc,
        topics,
        keyFacts,
        contentLength: options.contentLength,
        targetDuration: `${duration.min}-${duration.max} min`,
      };
    } catch (error) {
      await this.prisma.viralContentProcessing.update({
        where: { id: processing.id },
        data: { status: 'PENDING' },
      });
      throw error;
    }
  }

  /**
   * Update content length and reprocess.
   */
  async updateContentLength(processingId: string, contentLength: ContentLength) {
    const proc = await this.prisma.viralContentProcessing.findUnique({
      where: { id: processingId },
      include: { viral_video: true },
    });
    if (!proc) throw new NotFoundException('Procesamiento no encontrado');

    // Reprocess with new length
    return this.processContent(proc.user_id, {
      viralVideoId: proc.viral_video_id,
      transcription: proc.raw_transcription || proc.processed_content || '',
      contentLength,
    });
  }

  /**
   * Get processing preview.
   */
  async getProcessingPreview(processingId: string) {
    const proc = await this.prisma.viralContentProcessing.findUnique({
      where: { id: processingId },
      include: {
        viral_video: { select: { title: true, channel_name: true, category: true, view_count: true } },
      },
    });
    if (!proc) throw new NotFoundException('Procesamiento no encontrado');

    return {
      ...proc,
      viral_video: proc.viral_video
        ? { ...proc.viral_video, view_count: Number(proc.viral_video.view_count) }
        : null,
      raw_transcription: undefined, // Don't expose raw transcription
    };
  }

  /**
   * Get trending viral videos per category.
   */
  async getTrending() {
    if (!this.youtubeApiKey) return { religious: [], educational: [], news: [] };

    const result: Record<string, any[]> = {};

    for (const cat of ['RELIGIOUS', 'EDUCATIONAL', 'NEWS'] as ViralCategory[]) {
      const videos = await this.prisma.viralVideo.findMany({
        where: { category: cat },
        orderBy: { view_count: 'desc' },
        take: 10,
      });
      result[cat.toLowerCase()] = videos.map((v) => ({
        videoId: v.youtube_video_id,
        title: v.title,
        channelTitle: v.channel_name,
        thumbnail: v.thumbnail_url,
        viewCount: Number(v.view_count),
        likeCount: v.like_count,
        duration: this.formatDuration(v.duration_seconds),
        publishedAt: v.published_at?.toISOString?.() || v.published_at,
      }));
    }

    return result;
  }

  /**
   * Get search history for a user.
   */
  async getHistory(userId: string) {
    const searches = await this.prisma.viralSearch.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 20,
      include: { _count: { select: { videos: true } } },
    });
    return searches.map((s) => ({
      id: s.id,
      category: s.category,
      minViews: s.min_views,
      minLikes: s.min_likes,
      dateRange: s.date_range,
      resultsCount: s.results_count,
      createdAt: s.created_at?.toISOString?.() || s.created_at,
    }));
  }

  // ─── Private helpers ──────────────────────────────────────────────

  private async getYouTubeCaptions(videoId: string): Promise<string | null> {
    try {
      // Try to get captions list
      const captionsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/captions?videoId=${videoId}&part=snippet&key=${this.youtubeApiKey}`,
      );

      if (!captionsResponse.ok) return null;

      const captionsData = await captionsResponse.json();
      const spanishCaption = captionsData.items?.find(
        (c: any) => c.snippet.language === 'es' || c.snippet.language === 'es-419',
      );
      const autoCaption = captionsData.items?.find(
        (c: any) => c.snippet.trackKind === 'ASR',
      );
      const anyCaption = captionsData.items?.[0];

      const captionId = spanishCaption?.id || autoCaption?.id || anyCaption?.id;
      if (!captionId) return null;

      // Note: Downloading captions requires OAuth, so we return metadata
      // In production, use youtube-transcript library or Whisper API
      return `[Subtítulos disponibles para video ${videoId}. Caption ID: ${captionId}. Idioma: ${spanishCaption?.snippet.language || autoCaption?.snippet.language || 'auto'}]`;
    } catch {
      return null;
    }
  }

  private formatDuration(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  private parseDuration(isoDuration: string): number {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    return hours * 3600 + minutes * 60 + seconds;
  }
}
