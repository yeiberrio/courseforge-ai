import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ViralCategory, ContentLength } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

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
  TECHNOLOGY: [
    'inteligencia artificial', 'programación', 'desarrollo web', 'machine learning',
    'ciberseguridad', 'blockchain', 'apps', 'software', 'hardware', 'gadgets',
    'startup', 'innovación', 'cloud computing', 'python', 'javascript',
  ],
  HEALTH: [
    'salud', 'bienestar', 'nutrición', 'ejercicio', 'fitness', 'meditación',
    'yoga', 'dieta', 'medicina natural', 'salud mental', 'psicología',
    'alimentación saludable', 'hábitos saludables', 'dormir mejor',
  ],
  BUSINESS: [
    'emprendimiento', 'negocios', 'marketing digital', 'ventas', 'liderazgo',
    'startup', 'e-commerce', 'branding', 'plan de negocios', 'networking',
    'productividad', 'gestión empresarial', 'estrategia', 'inversión',
  ],
  ENTERTAINMENT: [
    'entretenimiento', 'películas', 'series', 'cine', 'televisión', 'celebridades',
    'cultura pop', 'viral', 'tendencias', 'retos', 'challenges', 'reacción',
    'review', 'crítica', 'top 10',
  ],
  SCIENCE: [
    'ciencia', 'física', 'química', 'biología', 'astronomía', 'naturaleza',
    'experimentos', 'descubrimientos', 'universo', 'espacio', 'genética',
    'evolución', 'medio ambiente', 'cambio climático', 'energía renovable',
  ],
  SPORTS: [
    'fútbol', 'deportes', 'NBA', 'Champions League', 'olimpiadas', 'boxeo',
    'MMA', 'tenis', 'ciclismo', 'entrenamiento', 'goles', 'highlights',
    'resumen deportivo', 'fichajes', 'mundial',
  ],
  COOKING: [
    'recetas', 'cocina', 'gastronomía', 'cocinar', 'chef', 'comida',
    'repostería', 'receta fácil', 'cocina casera', 'comida saludable',
    'postres', 'platos típicos', 'street food', 'restaurantes',
  ],
  MUSIC: [
    'música', 'canción', 'artista', 'concierto', 'álbum', 'letra',
    'producción musical', 'beat', 'rap', 'reggaeton', 'rock', 'pop',
    'cover', 'tutorial música', 'instrumentos',
  ],
  TRAVEL: [
    'viajes', 'turismo', 'destinos', 'aventura', 'mochilero', 'hotel',
    'vuelos baratos', 'guía de viaje', 'lugares increíbles', 'naturaleza',
    'playa', 'montaña', 'ciudades', 'cultura', 'tips de viaje',
  ],
  FINANCE: [
    'finanzas personales', 'inversiones', 'bolsa de valores', 'criptomonedas',
    'bitcoin', 'ahorro', 'dinero', 'trading', 'fondos de inversión',
    'independencia financiera', 'deudas', 'presupuesto', 'economía',
  ],
  MOTIVATION: [
    'motivación', 'superación personal', 'desarrollo personal', 'éxito',
    'mentalidad', 'hábitos', 'disciplina', 'autoestima', 'confianza',
    'metas', 'propósito de vida', 'inspiración', 'coaching', 'mindset',
  ],
  COMEDY: [
    'comedia', 'humor', 'chistes', 'parodia', 'sketch', 'stand up',
    'bromas', 'fails', 'compilación graciosa', 'memes', 'viral gracioso',
    'risa', 'entretenimiento', 'sátira',
  ],
  GAMING: [
    'videojuegos', 'gaming', 'gameplay', 'lets play', 'esports',
    'minecraft', 'fortnite', 'gta', 'call of duty', 'ps5', 'xbox',
    'nintendo', 'review juegos', 'trucos gaming', 'speedrun',
  ],
  FASHION: [
    'moda', 'tendencias moda', 'outfit', 'estilo', 'ropa', 'accesorios',
    'belleza', 'maquillaje', 'skincare', 'haul', 'shopping',
    'diseño de moda', 'lookbook', 'fashion tips',
  ],
  DIY: [
    'hazlo tú mismo', 'DIY', 'manualidades', 'decoración', 'bricolaje',
    'proyectos caseros', 'reciclaje creativo', 'organización', 'trucos hogar',
    'reparaciones', 'ideas creativas', 'artesanía', 'crafts',
  ],
  POLITICS: [
    'política', 'gobierno', 'elecciones', 'democracia', 'leyes',
    'congreso', 'presidente', 'debate político', 'geopolítica',
    'relaciones internacionales', 'diplomacia', 'derechos humanos',
  ],
  ENVIRONMENT: [
    'medio ambiente', 'ecología', 'cambio climático', 'sostenibilidad',
    'energía renovable', 'reciclaje', 'contaminación', 'naturaleza',
    'animales', 'biodiversidad', 'conservación', 'planeta',
  ],
  WORLD_CUP_2026: [
    'mundial 2026', 'world cup 2026', 'FIFA 2026', 'copa del mundo 2026',
    'mundial fútbol 2026', 'eliminatorias mundial 2026', 'selección nacional mundial',
    'clasificación mundial 2026', 'sede mundial México USA Canadá',
    'grupos mundial 2026', 'sorteo mundial 2026', 'estadios mundial 2026',
    'calendario mundial 2026', 'predicciones mundial 2026', 'favoritos mundial 2026',
    'goles mundial', 'partidos mundial 2026',
  ],
};

const CATEGORY_IDS: Record<string, string[]> = {
  RELIGIOUS: ['27', '22', '29'],
  EDUCATIONAL: ['27', '28', '26'],
  NEWS: ['25', '28'],
  TECHNOLOGY: ['28', '27'],
  HEALTH: ['26', '27'],
  BUSINESS: ['27', '22'],
  ENTERTAINMENT: ['24', '23', '22'],
  SCIENCE: ['28', '27'],
  SPORTS: ['17'],
  COOKING: ['26', '22'],
  MUSIC: ['10'],
  TRAVEL: ['19', '22'],
  FINANCE: ['27', '22'],
  MOTIVATION: ['27', '22'],
  COMEDY: ['23', '24'],
  GAMING: ['20'],
  FASHION: ['26', '22'],
  DIY: ['26', '22'],
  POLITICS: ['25'],
  ENVIRONMENT: ['28', '29'],
  WORLD_CUP_2026: ['17'],
};

// Date range mapping: key -> hours back
const DATE_RANGE_MAP: Record<string, number> = {
  '12h': 12,
  '24h': 24,
  '2d': 48,
  '3d': 72,
  '4d': 96,
  '7d': 168,
  '15d': 360,
  '1m': 720,
  '2m': 1440,
  '3m': 2160,
  '4m': 2880,
  '5m': 3600,
  '6m': 4320,
  '7m': 5040,
  '8m': 5760,
  '9m': 6480,
  '10m': 7200,
  '11m': 7920,
  '12m': 8760,
  // Legacy support
  '30d': 720,
  '90d': 2160,
  '365d': 8760,
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
   * Single YouTube search API call.
   */
  private async searchYouTubeSingle(options: {
    query: string;
    publishedAfter: string;
    maxResults: number;
    relevanceLanguage?: string;
    regionCode?: string;
    eventType?: string;
  }): Promise<string[]> {
    const params: Record<string, string> = {
      part: 'snippet',
      q: options.query,
      type: 'video',
      order: 'viewCount',
      publishedAfter: options.publishedAfter,
      maxResults: String(Math.min(options.maxResults, 50)),
      key: this.youtubeApiKey,
    };

    if (options.relevanceLanguage) params.relevanceLanguage = options.relevanceLanguage;
    if (options.regionCode) params.regionCode = options.regionCode;
    if (options.eventType) {
      params.eventType = options.eventType;
    } else {
      params.videoDuration = 'medium';
    }

    const searchParams = new URLSearchParams(params);
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`,
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      this.logger.error(`YouTube search error: ${JSON.stringify(err)}`);
      throw new Error(`YouTube search failed: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return (data.items || []).map((item: any) => item.id.videoId).filter(Boolean);
  }

  /**
   * Search YouTube for viral videos matching criteria.
   */
  async searchViral(userId: string, options: {
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
  }) {
    if (!this.youtubeApiKey) {
      throw new BadRequestException('YOUTUBE_API_KEY no configurada');
    }

    const {
      category,
      keywords,
      minViews = 100000,
      minLikes = 5000,
      minComments = 0,
      dateRange = '1m',
      language = 'es',
      languages = [],
      countries = [],
      eventType,
      sortBy = 'viewCount',
      maxResults = 20,
    } = options;

    // Build language list: use languages array if provided, otherwise fall back to single language
    const langList = languages.length > 0 ? languages : [language];
    // Countries: empty = worldwide (no regionCode)
    const countryList = countries.length > 0 ? countries : [null];

    // Calculate combinations and cap at 6 API calls
    const combinations: { lang: string | null; country: string | null }[] = [];
    for (const lang of langList) {
      for (const country of countryList) {
        combinations.push({ lang, country });
      }
    }

    if (combinations.length > 6) {
      throw new BadRequestException(
        `Demasiadas combinaciones de filtros (${combinations.length}). Máximo 6 combinaciones (países × idiomas).`,
      );
    }

    // Calculate publishedAfter date
    const hoursBack = DATE_RANGE_MAP[dateRange] || 720;
    const publishedAfter = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

    // Build search query
    const searchKeywords = keywords?.length
      ? keywords
      : VIRAL_KEYWORDS[category] || VIRAL_KEYWORDS.EDUCATIONAL;
    const searchQuery = searchKeywords.slice(0, 5).join(' | ');

    // Execute parallel YouTube API calls
    const perCallMax = Math.min(Math.floor(maxResults / combinations.length) + 5, 50);
    const allVideoIds = new Set<string>();

    const searchPromises = combinations.map(({ lang, country }) =>
      this.searchYouTubeSingle({
        query: searchQuery,
        publishedAfter,
        maxResults: perCallMax,
        relevanceLanguage: lang || undefined,
        regionCode: country || undefined,
        eventType: eventType || undefined,
      }).catch((err) => {
        this.logger.warn(`YouTube call failed for lang=${lang} country=${country}: ${err.message}`);
        return [] as string[];
      }),
    );

    const results = await Promise.all(searchPromises);
    for (const ids of results) {
      for (const id of ids) allVideoIds.add(id);
    }

    if (allVideoIds.size === 0) {
      return { search: null, videos: [], totalResults: 0, category };
    }

    // Get video statistics (batch, max 50 per call)
    const uniqueIds = Array.from(allVideoIds);
    const allStatsItems: any[] = [];

    for (let i = 0; i < uniqueIds.length; i += 50) {
      const batch = uniqueIds.slice(i, i + 50);
      const statsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet,liveStreamingDetails&id=${batch.join(',')}&key=${this.youtubeApiKey}`,
      );
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        allStatsItems.push(...(statsData.items || []));
      }
    }

    // Filter by view/like/comment thresholds
    const filteredVideos = allStatsItems.filter((video: any) => {
      const views = parseInt(video.statistics.viewCount || '0');
      const likes = parseInt(video.statistics.likeCount || '0');
      const comments = parseInt(video.statistics.commentCount || '0');
      return (views >= minViews || likes >= minLikes) && comments >= minComments;
    });

    // Sort results
    const sorted = [...filteredVideos].sort((a: any, b: any) => {
      const aViews = parseInt(a.statistics.viewCount || '0');
      const bViews = parseInt(b.statistics.viewCount || '0');
      const aLikes = parseInt(a.statistics.likeCount || '0');
      const bLikes = parseInt(b.statistics.likeCount || '0');
      const aComments = parseInt(a.statistics.commentCount || '0');
      const bComments = parseInt(b.statistics.commentCount || '0');
      const aEngagement = aViews > 0 ? ((aLikes + aComments) / aViews) * 100 : 0;
      const bEngagement = bViews > 0 ? ((bLikes + bComments) / bViews) * 100 : 0;

      switch (sortBy) {
        case 'likeCount': return bLikes - aLikes;
        case 'commentCount': return bComments - aComments;
        case 'engagementRate': return bEngagement - aEngagement;
        default: return bViews - aViews;
      }
    });

    // Limit to maxResults
    const finalVideos = sorted.slice(0, maxResults);

    // Create search record
    const search = await this.prisma.viralSearch.create({
      data: {
        user_id: userId,
        category,
        keywords: searchKeywords,
        min_views: minViews,
        min_likes: minLikes,
        min_comments: minComments,
        date_range: dateRange,
        language,
        languages: langList,
        countries: countries,
        event_type: eventType || null,
        sort_by: sortBy,
        results_count: finalVideos.length,
      },
    });

    // Save video results
    const videos: any[] = [];
    for (const video of finalVideos) {
      const duration = this.parseDuration(video.contentDetails.duration);
      const views = parseInt(video.statistics.viewCount || '0');
      const likes = parseInt(video.statistics.likeCount || '0');
      const comments = parseInt(video.statistics.commentCount || '0');
      const isLive = video.snippet.liveBroadcastContent === 'live';

      const saved = await this.prisma.viralVideo.create({
        data: {
          search_id: search.id,
          youtube_video_id: video.id,
          title: video.snippet.title,
          channel_name: video.snippet.channelTitle,
          channel_id: video.snippet.channelId,
          thumbnail_url: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url,
          view_count: BigInt(views),
          like_count: likes,
          comment_count: comments,
          duration_seconds: duration,
          published_at: new Date(video.snippet.publishedAt),
          category,
        },
      });
      videos.push({
        ...saved,
        view_count: Number(saved.view_count),
        engagement_rate: views > 0 ? parseFloat(((likes + comments) / views * 100).toFixed(2)) : 0,
        is_live: isLive,
      } as any);
    }

    this.logger.log(`Viral search: found ${videos.length} videos for category ${category} (${combinations.length} API calls)`);

    const mappedVideos = videos.map((v: any) => ({
      videoId: v.youtube_video_id,
      title: v.title,
      channelTitle: v.channel_name,
      thumbnail: v.thumbnail_url,
      viewCount: Number(v.view_count),
      likeCount: v.like_count,
      commentCount: v.comment_count,
      engagementRate: v.engagement_rate,
      isLive: v.is_live,
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
   */
  async transcribeVideo(videoId: string) {
    let video = await this.prisma.viralVideo.findUnique({ where: { id: videoId } });
    if (!video) {
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
      const transcription = await this.getYouTubeCaptions(video.youtube_video_id);

      if (!transcription) {
        await this.prisma.viralVideo.update({
          where: { id: dbId },
          data: { transcription_status: 'FAILED' },
        });
        throw new BadRequestException(
          'No se pudieron obtener subtítulos para este video. El video puede no tener subtítulos disponibles.',
        );
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
   * Process transcription into original content using Claude.
   * Now supports tone, target audience, and content goal (course vs viral video).
   */
  async processContent(userId: string, options: {
    viralVideoId: string;
    transcription: string;
    contentLength: ContentLength;
    language?: string;
    tone?: string;
    targetAudience?: string;
    contentGoal?: string;
    autoPublishYoutube?: boolean;
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

    const tone = options.tone || 'educativo';
    const targetAudience = options.targetAudience || 'público general';
    const contentGoal = options.contentGoal || 'COURSE';
    const autoPublish = options.autoPublishYoutube || false;

    // Create processing record
    const processing = await this.prisma.viralContentProcessing.create({
      data: {
        viral_video_id: video.id,
        user_id: userId,
        raw_transcription: options.transcription,
        content_length: options.contentLength,
        tone,
        target_audience: targetAudience,
        content_goal: contentGoal,
        auto_publish_youtube: autoPublish,
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

    // Build prompt based on content goal
    const isViralGoal = contentGoal === 'VIRAL_VIDEO';

    const goalInstructions = isViralGoal
      ? `OBJETIVO: Crear un GUIÓN para un video de YouTube diseñado para volverse VIRAL.
El contenido debe:
- Tener un gancho poderoso en los primeros 5 segundos
- Mantener la atención con transiciones dinámicas
- Incluir calls-to-action (suscribirse, like, comentar)
- Usar storytelling y datos impactantes
- Estar optimizado para retención de audiencia
- Incluir SEO: título viral, descripción optimizada, tags estratégicos
- Sugerir timestamps para capítulos de YouTube

FORMATO DE SALIDA (JSON estricto):
{
  "title": "Título viral y clickbait ético (max 60 chars)",
  "description": "Descripción SEO optimizada para YouTube (500+ palabras con keywords)",
  "target_audience": "${targetAudience}",
  "seo_tags": ["tag1", "tag2", "tag3", ...hasta 30 tags],
  "seo_title": "Título SEO alternativo",
  "seo_description": "Meta description corta (160 chars)",
  "youtube_category": "ID categoría YouTube",
  "hooks": ["Gancho 1 para intro", "Gancho alternativo"],
  "timestamps": ["0:00 Intro", "0:15 Tema 1", ...],
  "modules": [
    {
      "title": "Sección del video",
      "content": "Guión completo de narración para esta sección",
      "key_points": ["Punto clave 1"],
      "visual_suggestions": ["Sugerencia visual para esta sección"]
    }
  ],
  "call_to_action": "CTA final del video",
  "thumbnail_ideas": ["Idea 1 para thumbnail viral"],
  "disclaimer": "Contenido original..."
}`
      : `OBJETIVO: Crear contenido COMPLETAMENTE ORIGINAL para un curso educativo.

REGLAS ESTRICTAS:
1. NUNCA copies frases, párrafos o estructura del contenido fuente
2. Usa la información factual como INSPIRACIÓN, no como base para parafrasear
3. Agrega perspectivas, contexto histórico y análisis que NO estén en la fuente
4. Cita fuentes académicas, libros o artículos reconocidos (no el video fuente)
5. Estructura el contenido como material pedagógico profesional
6. Incluye preguntas de reflexión y ejercicios prácticos
7. El resultado debe ser autosuficiente

FORMATO DE SALIDA (JSON estricto):
{
  "title": "Título atractivo y SEO del curso",
  "description": "Descripción de 2-3 párrafos",
  "target_audience": "${targetAudience}",
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

    const systemPrompt = `Eres un experto en diseño instruccional y creación de contenido ${isViralGoal ? 'viral para YouTube' : 'educativo original'}.
Se te proporcionará información factual extraída de una fuente de video.

TONO: ${tone}
PÚBLICO OBJETIVO: ${targetAudience}
EXTENSIÓN: ${options.contentLength}
- Duración narración: ${duration.min}-${duration.max} minutos (~${duration.words_min}-${duration.words_max} palabras)
- ${isViralGoal ? 'Secciones' : 'Módulos'}: ${duration.modules_min}-${duration.modules_max}

CATEGORÍA: ${video.category}
IDIOMA: ${options.language || 'español'}

${goalInstructions}`;

    try {
      const userMessage = `Información factual extraída del video "${video.title}" (${video.category}):\n\n${options.transcription.substring(0, 10000)}\n\nGenera el contenido original en formato JSON.`;

      let content = '';

      if (this.openaiApiKey) {
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

      // Generate TXT and PDF files for knowledge base
      const filePaths = await this.generateDocumentFiles(processing.id, generatedDoc, video.title || 'contenido');

      // Update processing record
      await this.prisma.viralContentProcessing.update({
        where: { id: processing.id },
        data: {
          processed_content: content,
          topics_extracted: topics,
          key_facts: keyFacts,
          generated_document: generatedDoc,
          generated_file_path: filePaths.txtPath,
          target_duration_minutes: duration.max,
          status: 'READY',
        },
      });

      // Auto-ingest into knowledge base
      await this.ingestToKnowledgeBase(processing.id, generatedDoc, video, filePaths.txtPath);

      // Schedule raw transcription deletion (privacy)
      setTimeout(async () => {
        try {
          await this.prisma.viralContentProcessing.update({
            where: { id: processing.id },
            data: { raw_transcription: null },
          });
        } catch {}
      }, 24 * 60 * 60 * 1000);

      return {
        id: processing.id,
        generatedDocument: generatedDoc,
        topics,
        keyFacts,
        contentLength: options.contentLength,
        targetDuration: `${duration.min}-${duration.max} min`,
        contentGoal,
        autoPublishYoutube: autoPublish,
        generatedFilePath: filePaths.txtPath,
        tone,
        targetAudience,
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
   * Generate TXT document file from processed content.
   */
  private async generateDocumentFiles(processingId: string, doc: any, videoTitle: string) {
    const kbDir = join(process.cwd(), 'uploads', 'knowledge-base', 'viral');
    mkdirSync(kbDir, { recursive: true });

    // Generate TXT
    let txtContent = '';
    txtContent += `# ${doc?.title || videoTitle}\n\n`;
    txtContent += `Fecha de generación: ${new Date().toISOString().split('T')[0]}\n`;
    txtContent += `Fuente: Video viral - ${videoTitle}\n\n`;

    if (doc?.description) {
      txtContent += `## Descripción\n\n${doc.description}\n\n`;
    }

    if (doc?.target_audience) {
      txtContent += `## Público objetivo\n\n${doc.target_audience}\n\n`;
    }

    if (doc?.objectives) {
      txtContent += `## Objetivos\n\n`;
      doc.objectives.forEach((obj: string, i: number) => {
        txtContent += `${i + 1}. ${obj}\n`;
      });
      txtContent += '\n';
    }

    if (doc?.modules) {
      txtContent += `## Contenido (${doc.modules.length} módulos)\n\n`;
      doc.modules.forEach((mod: any, i: number) => {
        txtContent += `### ${i + 1}. ${mod.title}\n\n`;
        if (mod.content) txtContent += `${mod.content}\n\n`;
        if (mod.key_points?.length) {
          txtContent += `**Puntos clave:**\n`;
          mod.key_points.forEach((p: string) => txtContent += `- ${p}\n`);
          txtContent += '\n';
        }
        if (mod.reflection_questions?.length) {
          txtContent += `**Preguntas de reflexión:**\n`;
          mod.reflection_questions.forEach((q: string) => txtContent += `- ${q}\n`);
          txtContent += '\n';
        }
        txtContent += '---\n\n';
      });
    }

    if (doc?.seo_tags) {
      txtContent += `## Tags SEO\n\n${doc.seo_tags.join(', ')}\n\n`;
    }

    if (doc?.disclaimer) {
      txtContent += `## Disclaimer\n\n${doc.disclaimer}\n`;
    }

    const txtPath = join(kbDir, `${processingId}.txt`);
    writeFileSync(txtPath, txtContent);

    return {
      txtPath: `/uploads/knowledge-base/viral/${processingId}.txt`,
      txtContent,
    };
  }

  /**
   * Auto-ingest processed content into knowledge base.
   */
  private async ingestToKnowledgeBase(processingId: string, doc: any, video: any, filePath: string) {
    try {
      const content = JSON.stringify(doc, null, 2);
      const chunks = this.chunkText(content, 512, 50);

      const existing = await this.prisma.knowledgeBaseDocument.findFirst({
        where: { viral_video_id: video.id, source_type: 'VIRAL_CONTENT' },
      });

      if (existing) {
        await this.prisma.knowledgeBaseDocument.update({
          where: { id: existing.id },
          data: {
            title: doc?.title || video.title || 'Contenido viral procesado',
            category: video.category || null,
            tags: (doc?.seo_tags || doc?.modules?.map((m: any) => m.title)) || [],
            file_path: filePath,
            file_size_bytes: Buffer.byteLength(content),
            chunk_count: chunks.length,
            ingested_at: new Date(),
          },
        });
      } else {
        await this.prisma.knowledgeBaseDocument.create({
          data: {
            title: doc?.title || video.title || 'Contenido viral procesado',
            category: video.category || null,
            tags: (doc?.seo_tags || doc?.modules?.map((m: any) => m.title)) || [],
            file_path: filePath,
            file_size_bytes: Buffer.byteLength(content),
            chunk_count: chunks.length,
            source_type: 'VIRAL_CONTENT',
            viral_video_id: video.id,
            ingested_at: new Date(),
          },
        });
      }

      this.logger.log(`[KB] Auto-ingested viral content: ${doc?.title || video.title}`);
    } catch (err) {
      this.logger.warn(`[KB] Failed to auto-ingest: ${err.message}`);
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

    return this.processContent(proc.user_id, {
      viralVideoId: proc.viral_video_id,
      transcription: proc.raw_transcription || proc.processed_content || '',
      contentLength,
      tone: proc.tone || undefined,
      targetAudience: proc.target_audience || undefined,
      contentGoal: proc.content_goal || undefined,
      autoPublishYoutube: proc.auto_publish_youtube,
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
      raw_transcription: undefined,
    };
  }

  /**
   * Get trending viral videos per category.
   */
  async getTrending() {
    if (!this.youtubeApiKey) return {};

    const allCategories = Object.keys(VIRAL_KEYWORDS) as ViralCategory[];
    const result: Record<string, any[]> = {};

    for (const cat of allCategories) {
      const videos = await this.prisma.viralVideo.findMany({
        where: { category: cat as ViralCategory },
        orderBy: { view_count: 'desc' },
        take: 10,
      });
      if (videos.length > 0) {
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

  /**
   * Get available categories with labels.
   */
  getCategories() {
    return Object.keys(VIRAL_KEYWORDS).map((key) => ({
      key,
      label: this.getCategoryLabel(key),
      keywordsCount: VIRAL_KEYWORDS[key].length,
    }));
  }

  /**
   * Get available date ranges.
   */
  getDateRanges() {
    return [
      { value: '12h', label: 'Últimas 12 horas' },
      { value: '24h', label: 'Últimas 24 horas' },
      { value: '2d', label: 'Últimos 2 días' },
      { value: '3d', label: 'Últimos 3 días' },
      { value: '4d', label: 'Últimos 4 días' },
      { value: '7d', label: 'Última semana' },
      { value: '15d', label: 'Últimos 15 días' },
      { value: '1m', label: 'Último mes' },
      { value: '2m', label: 'Últimos 2 meses' },
      { value: '3m', label: 'Últimos 3 meses' },
      { value: '4m', label: 'Últimos 4 meses' },
      { value: '5m', label: 'Últimos 5 meses' },
      { value: '6m', label: 'Últimos 6 meses' },
      { value: '7m', label: 'Últimos 7 meses' },
      { value: '8m', label: 'Últimos 8 meses' },
      { value: '9m', label: 'Últimos 9 meses' },
      { value: '10m', label: 'Últimos 10 meses' },
      { value: '11m', label: 'Últimos 11 meses' },
      { value: '12m', label: 'Último año' },
    ];
  }

  /**
   * Extract key segments from a video transcription using AI.
   * Returns timestamps, summaries, relevance types, and direct YouTube links.
   */
  async extractSegments(videoId: string, transcription?: string) {
    if (!this.openaiApiKey && !this.anthropicApiKey) {
      throw new BadRequestException('Se requiere OPENAI_API_KEY o ANTHROPIC_API_KEY para extracción de segmentos');
    }

    let video = await this.prisma.viralVideo.findUnique({ where: { id: videoId } });
    if (!video) {
      video = await this.prisma.viralVideo.findFirst({
        where: { youtube_video_id: videoId },
        orderBy: { created_at: 'desc' },
      });
    }
    if (!video) throw new NotFoundException('Video no encontrado');

    // Use provided transcription or try to get captions
    let text = transcription;
    if (!text) {
      const captions = await this.getYouTubeCaptions(video.youtube_video_id);
      if (!captions) {
        throw new BadRequestException('No hay transcripción disponible. Transcribe el video primero.');
      }
      text = captions;
    }

    const systemPrompt = `Eres un experto en análisis de contenido de video y marketing digital.
Se te proporcionará la transcripción REAL con timestamps de un video de YouTube.

Tu tarea es identificar los segmentos más valiosos e interesantes del video.

IMPORTANTE - REGLAS DE TIMESTAMPS:
- La transcripción tiene formato "[M:SS] texto..." con timestamps REALES del video
- DEBES usar ÚNICAMENTE los timestamps que aparecen en la transcripción
- NO inventes ni estimes timestamps. Cada segmento DEBE corresponder a un timestamp exacto de la transcripción
- Lee el texto en cada timestamp para entender QUÉ está pasando en ese momento exacto
- El título y resumen del segmento DEBEN describir lo que REALMENTE se dice/muestra en esos timestamps
- NO asumas el contenido basándote en el título del video - usa SOLO lo que dice la transcripción

Para cada segmento, debes extraer:
- start: timestamp de inicio EXACTO tomado de la transcripción (formato M:SS o H:MM:SS)
- end: timestamp de fin tomado de la transcripción (formato M:SS o H:MM:SS)
- start_seconds: inicio en segundos (número entero, calculado del timestamp)
- title: título descriptivo corto del segmento basado en lo que REALMENTE se dice
- summary: resumen de 1-2 oraciones de lo que REALMENTE se dice en la transcripción en ese rango de tiempo
- relevance: tipo de relevancia (uno de: "hook", "dato_clave", "momento_viral", "cta", "storytelling", "controversia", "tutorial", "humor", "emocional", "insight")
- score: puntuación de 1 a 10 de qué tan valioso/interesante es el segmento

REGLAS:
- Identifica entre 3 y 12 segmentos según la duración del video
- Los segmentos NO deben solaparse
- Ordénalos cronológicamente por timestamp
- Prioriza momentos que: generen engagement, sean compartibles, tengan valor educativo, o sean virales
- El video tiene una duración de ${video.duration_seconds} segundos (${this.formatDuration(video.duration_seconds)})
- VERIFICA que cada título y resumen corresponda al contenido REAL de la transcripción en esos timestamps

FORMATO DE SALIDA (JSON estricto):
{
  "segments": [
    {
      "start": "0:00",
      "end": "0:45",
      "start_seconds": 0,
      "title": "Título basado en lo que realmente se dice",
      "summary": "Resumen fiel al contenido real de la transcripción en este rango...",
      "relevance": "hook",
      "score": 9
    }
  ],
  "total_segments": 5,
  "video_coverage_percent": 65,
  "top_moment": "Breve descripción del momento más destacado del video"
}`;

    const userMessage = `Video: "${video.title}" (${this.formatDuration(video.duration_seconds)})
Canal: ${video.channel_name}
Categoría: ${video.category}

Transcripción con timestamps:
${text.substring(0, 15000)}

RECUERDA: Usa SOLO los timestamps y contenido que aparecen en la transcripción anterior. No inventes eventos ni timestamps.
Extrae los segmentos más valiosos en formato JSON.`;

    let content = '';

    if (this.openaiApiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 4000,
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
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
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

    // Parse JSON response
    let result: any;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      result = null;
    }

    if (!result?.segments) {
      throw new Error('No se pudieron extraer segmentos del video');
    }

    // Add YouTube links to each segment
    const youtubeVideoId = video.youtube_video_id;
    result.segments = result.segments.map((seg: any) => ({
      ...seg,
      youtube_url: `https://youtu.be/${youtubeVideoId}?t=${seg.start_seconds}`,
      youtube_embed_url: `https://www.youtube.com/embed/${youtubeVideoId}?start=${seg.start_seconds}`,
    }));

    return {
      video: {
        id: video.id,
        youtubeVideoId,
        title: video.title,
        channelName: video.channel_name,
        duration: this.formatDuration(video.duration_seconds),
        durationSeconds: video.duration_seconds,
      },
      ...result,
    };
  }

  /**
   * Export viral videos to an Excel (.xlsx) buffer.
   */
  async exportToExcel(videos: {
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
  }[], category?: string): Promise<Buffer> {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CourseForge AI';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Contenido Viral');

    // Columns
    sheet.columns = [
      { header: 'Titulo', key: 'title', width: 50 },
      { header: 'Canal', key: 'channel', width: 25 },
      { header: 'Categoria', key: 'category', width: 18 },
      { header: 'Vistas', key: 'views', width: 14 },
      { header: 'Likes', key: 'likes', width: 12 },
      { header: 'Comentarios', key: 'comments', width: 14 },
      { header: 'Engagement %', key: 'engagement', width: 14 },
      { header: 'Duracion', key: 'duration', width: 12 },
      { header: 'Publicado', key: 'published', width: 14 },
      { header: 'URL YouTube', key: 'url', width: 45 },
    ];

    // Header style
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FF3730A3' } },
      };
    });
    sheet.getRow(1).height = 28;

    // Data rows
    for (const video of videos) {
      const categoryLabel = this.getCategoryLabel(video.category || category || '');
      sheet.addRow({
        title: video.title,
        channel: video.channelTitle,
        category: categoryLabel,
        views: video.viewCount,
        likes: video.likeCount,
        comments: video.commentCount || 0,
        engagement: video.engagementRate ? `${video.engagementRate.toFixed(1)}%` : '0%',
        duration: video.duration,
        published: video.publishedAt ? new Date(video.publishedAt).toLocaleDateString('es-CO') : '',
        url: `https://www.youtube.com/watch?v=${video.videoId}`,
      });
    }

    // Format number columns
    sheet.getColumn('views').numFmt = '#,##0';
    sheet.getColumn('likes').numFmt = '#,##0';
    sheet.getColumn('comments').numFmt = '#,##0';

    // Alternate row colors
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const fill = rowNumber % 2 === 0
          ? { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF5F3FF' } }
          : undefined;
        row.eachCell((cell) => {
          if (fill) cell.fill = fill;
          cell.border = {
            bottom: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
          };
        });
      }
    });

    // Auto-filter
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: videos.length + 1, column: 10 },
    };

    // Freeze header
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Export viral videos to a Google Sheet (append to existing or create new).
   * Requires YouTube OAuth with Sheets scope.
   */
  async exportToGoogleSheets(userId: string, videos: {
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
  }[], category?: string): Promise<{ spreadsheetId: string; spreadsheetUrl: string; rowsAdded: number }> {
    // Get YouTube OAuth token
    const channel = await this.prisma.youTubeChannel.findFirst({
      where: { user_id: userId, is_active: true },
      orderBy: { connected_at: 'desc' },
    });

    if (!channel) {
      throw new BadRequestException('Conecta tu canal de YouTube primero (se requiere OAuth con permisos de Google Sheets). Ve a YouTube → Conectar canal.');
    }

    // Get valid access token (refresh if needed)
    const accessToken = await this.getValidAccessToken(channel);

    // Check if spreadsheet already exists for this user
    let spreadsheetId = await this.getViralSpreadsheetId(userId);
    let isNew = false;

    if (!spreadsheetId) {
      // Create new spreadsheet
      spreadsheetId = await this.createViralSpreadsheet(accessToken);
      await this.saveViralSpreadsheetId(userId, spreadsheetId);
      isNew = true;
    }

    // Build rows to append
    const now = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const rows = videos.map((v) => [
      v.title,
      v.channelTitle,
      this.getCategoryLabel(v.category || category || ''),
      v.viewCount,
      v.likeCount,
      v.commentCount || 0,
      v.engagementRate ? `${v.engagementRate.toFixed(1)}%` : '0%',
      v.duration,
      v.publishedAt ? new Date(v.publishedAt).toLocaleDateString('es-CO') : '',
      `https://www.youtube.com/watch?v=${v.videoId}`,
      now,
    ]);

    // If new spreadsheet, add header row first
    if (isNew) {
      await this.appendToSheet(accessToken, spreadsheetId, [
        ['Titulo', 'Canal', 'Categoria', 'Vistas', 'Likes', 'Comentarios', 'Engagement %', 'Duracion', 'Publicado', 'URL YouTube', 'Exportado el'],
      ]);
    }

    // Append data rows
    await this.appendToSheet(accessToken, spreadsheetId, rows);

    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    this.logger.log(`Exported ${rows.length} viral videos to Google Sheets: ${spreadsheetUrl}`);

    return {
      spreadsheetId,
      spreadsheetUrl,
      rowsAdded: rows.length,
    };
  }

  private async getValidAccessToken(channel: {
    id: string;
    refresh_token_encrypted: string | null;
    access_token_encrypted: string | null;
    token_expiry: Date | null;
  }): Promise<string> {
    if (channel.token_expiry && new Date(channel.token_expiry) > new Date()) {
      return channel.access_token_encrypted || '';
    }

    if (!channel.refresh_token_encrypted) {
      throw new BadRequestException('Token expirado. Reconecta tu canal de YouTube.');
    }

    const clientId = this.configService.get<string>('YOUTUBE_CLIENT_ID') || '';
    const clientSecret = this.configService.get<string>('YOUTUBE_CLIENT_SECRET') || '';

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: channel.refresh_token_encrypted,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) throw new BadRequestException('No se pudo refrescar el token OAuth. Reconecta tu canal.');

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

  private async getViralSpreadsheetId(userId: string): Promise<string | null> {
    const record = await this.prisma.viralSearch.findFirst({
      where: { user_id: userId, spreadsheet_id: { not: null } },
      orderBy: { created_at: 'desc' },
      select: { spreadsheet_id: true },
    });
    return record?.spreadsheet_id || null;
  }

  private async saveViralSpreadsheetId(userId: string, spreadsheetId: string): Promise<void> {
    // Save on the most recent search so we can retrieve it later
    const latestSearch = await this.prisma.viralSearch.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    if (latestSearch) {
      await this.prisma.viralSearch.update({
        where: { id: latestSearch.id },
        data: { spreadsheet_id: spreadsheetId },
      });
    }
  }

  private async createViralSpreadsheet(accessToken: string): Promise<string> {
    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: `CourseForge - Contenido Viral`,
        },
        sheets: [{
          properties: {
            title: 'Historial Viral',
            gridProperties: { frozenRowCount: 1 },
          },
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      this.logger.error(`Google Sheets create failed: ${JSON.stringify(err)}`);
      throw new Error(err.error?.message || 'No se pudo crear el spreadsheet. Reconecta tu canal con los permisos de Google Sheets.');
    }

    const data = await response.json();
    return data.spreadsheetId;
  }

  private async appendToSheet(accessToken: string, spreadsheetId: string, rows: any[][]): Promise<void> {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:K:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: rows }),
      },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      this.logger.error(`Google Sheets append failed: ${JSON.stringify(err)}`);
      throw new Error(err.error?.message || 'Error al escribir en Google Sheets');
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────

  private getCategoryLabel(key: string): string {
    const labels: Record<string, string> = {
      RELIGIOUS: 'Religiosos',
      EDUCATIONAL: 'Educativos',
      NEWS: 'Noticias',
      TECHNOLOGY: 'Tecnología',
      HEALTH: 'Salud y Bienestar',
      BUSINESS: 'Negocios',
      ENTERTAINMENT: 'Entretenimiento',
      SCIENCE: 'Ciencia',
      SPORTS: 'Deportes',
      COOKING: 'Cocina',
      MUSIC: 'Música',
      TRAVEL: 'Viajes',
      FINANCE: 'Finanzas',
      MOTIVATION: 'Motivación',
      COMEDY: 'Comedia',
      GAMING: 'Gaming',
      FASHION: 'Moda y Belleza',
      DIY: 'Hazlo tú mismo',
      POLITICS: 'Política',
      ENVIRONMENT: 'Medio Ambiente',
      WORLD_CUP_2026: 'Mundial 2026',
    };
    return labels[key] || key;
  }

  /**
   * Fetch actual YouTube captions with timestamps.
   * Uses YouTube's internal timedtext endpoint (no OAuth required).
   */
  private async getYouTubeCaptions(videoId: string): Promise<string | null> {
    try {
      // Step 1: Fetch the video page to extract caption track URLs
      const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: { 'Accept-Language': 'es,en;q=0.9' },
      });
      if (!pageResponse.ok) return null;

      const pageHtml = await pageResponse.text();

      // Extract captions JSON from the page's ytInitialPlayerResponse
      const captionsMatch = pageHtml.match(/"captionTracks":\s*(\[.*?\])/);
      if (!captionsMatch) return null;

      let captionTracks: any[];
      try {
        captionTracks = JSON.parse(captionsMatch[1]);
      } catch {
        return null;
      }

      if (!captionTracks || captionTracks.length === 0) return null;

      // Prefer: Spanish manual > Spanish auto > any manual > any auto
      const spanishManual = captionTracks.find(
        (t: any) => (t.languageCode === 'es' || t.languageCode === 'es-419') && t.kind !== 'asr',
      );
      const spanishAuto = captionTracks.find(
        (t: any) => (t.languageCode === 'es' || t.languageCode === 'es-419'),
      );
      const anyManual = captionTracks.find((t: any) => t.kind !== 'asr');
      const anyTrack = captionTracks[0];

      const track = spanishManual || spanishAuto || anyManual || anyTrack;
      if (!track?.baseUrl) return null;

      // Step 2: Fetch the actual captions in XML format
      const captionUrl = track.baseUrl + '&fmt=srv3';
      const captionResponse = await fetch(captionUrl);
      if (!captionResponse.ok) return null;

      const captionXml = await captionResponse.text();

      // Step 3: Parse XML captions into timestamped text
      // Format: <p t="startMs" d="durationMs">text</p>
      const lines: string[] = [];
      const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
      let match: RegExpExecArray | null;

      while ((match = pRegex.exec(captionXml)) !== null) {
        const startMs = parseInt(match[1]);
        const text = match[3]
          .replace(/<[^>]+>/g, '') // strip HTML tags
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\n/g, ' ')
          .trim();

        if (!text) continue;

        const totalSeconds = Math.floor(startMs / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        const timestamp = `${mins}:${String(secs).padStart(2, '0')}`;

        lines.push(`[${timestamp}] ${text}`);
      }

      // Fallback: try <text> format (older caption format)
      if (lines.length === 0) {
        const textRegex = /<text\s+start="([\d.]+)"\s+dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
        while ((match = textRegex.exec(captionXml)) !== null) {
          const startSec = parseFloat(match[1]);
          const text = match[3]
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\n/g, ' ')
            .trim();

          if (!text) continue;

          const totalSeconds = Math.floor(startSec);
          const mins = Math.floor(totalSeconds / 60);
          const secs = totalSeconds % 60;
          const timestamp = `${mins}:${String(secs).padStart(2, '0')}`;

          lines.push(`[${timestamp}] ${text}`);
        }
      }

      if (lines.length === 0) return null;

      this.logger.log(`[Captions] Fetched ${lines.length} caption lines for video ${videoId} (lang: ${track.languageCode})`);
      return lines.join('\n');
    } catch (error) {
      this.logger.warn(`[Captions] Failed to fetch captions for ${videoId}: ${error.message}`);
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

  private chunkText(text: string, chunkSize: number = 512, overlap: number = 50): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim().length > 20) {
        chunks.push(chunk);
      }
    }
    return chunks;
  }
}
