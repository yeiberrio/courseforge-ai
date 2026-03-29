import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { writeFileSync } from 'fs';
import { join } from 'path';

export interface HeyGenVideoOptions {
  script: string;
  voice?: string;
  voiceSource?: 'heygen' | 'edge_tts';
  heygenVoiceId?: string;
  avatarId?: string;
  avatarType?: 'stock' | 'instant' | 'photo';
  avatarGender?: 'male' | 'female';
  sceneTemplate?: SceneTemplate;
  pipPosition?: 'bottom_right' | 'bottom_left' | 'top_right' | 'top_left';
  pipSize?: number;
  background?: string;
  backgroundCustomUrl?: string;
  emotion?: 'neutral' | 'enthusiastic' | 'serious' | 'warm';
  speed?: number;
  outputDir: string;
  moduleOrder: number;
}

export type SceneTemplate =
  | 'presenter'
  | 'split_screen'
  | 'pip'
  | 'talking_head'
  | 'news_anchor'
  | 'whiteboard';

export interface HeyGenAvatar {
  avatar_id: string;
  avatar_name: string;
  gender: string;
  preview_image_url: string;
  preview_video_url?: string;
  type: 'stock' | 'instant' | 'photo';
}

export interface HeyGenVoice {
  voice_id: string;
  language: string;
  gender: string;
  name: string;
  preview_audio?: string;
  support_pause: boolean;
  emotion_support: boolean;
}

@Injectable()
export class HeyGenVideoService {
  private readonly logger = new Logger(HeyGenVideoService.name);
  private readonly apiKey: string | undefined;
  private readonly apiUrl = 'https://api.heygen.com';
  // Default Spanish voices for HeyGen (Colombian-style Latam)
  private readonly defaultHeyGenVoiceMale = '72cbcf091d9d48998ce10d7b5c2d569e'; // Curious Diego - Friendly
  private readonly defaultHeyGenVoiceFemale = '6ce26db0cb6f4e7881b85452619f7f19'; // Camila Vega

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('HEYGEN_API_KEY');
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * List available stock avatars from HeyGen API.
   */
  async getAvatars(): Promise<HeyGenAvatar[]> {
    if (!this.apiKey) {
      return this.getFallbackAvatars();
    }

    try {
      const response = await fetch(`${this.apiUrl}/v2/avatars`, {
        headers: {
          'X-Api-Key': this.apiKey,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.warn(`HeyGen avatars API failed: ${response.statusText}`);
        return this.getFallbackAvatars();
      }

      const data = await response.json();
      const avatars: HeyGenAvatar[] = [];

      // Process talking_photo avatars
      if (data.data?.talking_photos) {
        for (const photo of data.data.talking_photos) {
          avatars.push({
            avatar_id: photo.talking_photo_id,
            avatar_name: photo.talking_photo_name || 'Photo Avatar',
            gender: 'unknown',
            preview_image_url: photo.preview_image_url || '',
            type: 'instant',
          });
        }
      }

      // Process regular avatars
      if (data.data?.avatars) {
        for (const avatar of data.data.avatars) {
          avatars.push({
            avatar_id: avatar.avatar_id,
            avatar_name: avatar.avatar_name || 'Avatar',
            gender: avatar.gender || 'unknown',
            preview_image_url: avatar.preview_image_url || '',
            preview_video_url: avatar.preview_video_url,
            type: 'stock',
          });
        }
      }

      this.logger.log(`Fetched ${avatars.length} avatars from HeyGen`);
      return avatars.length > 0 ? avatars : this.getFallbackAvatars();
    } catch (error) {
      this.logger.error(`Error fetching HeyGen avatars: ${error.message}`);
      return this.getFallbackAvatars();
    }
  }

  /**
   * List available voices from HeyGen filtered by language.
   */
  async getVoices(language: string = 'es'): Promise<HeyGenVoice[]> {
    if (!this.apiKey) {
      return this.getFallbackVoices();
    }

    try {
      const response = await fetch(`${this.apiUrl}/v2/voices`, {
        headers: {
          'X-Api-Key': this.apiKey,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.warn(`HeyGen voices API failed: ${response.statusText}`);
        return this.getFallbackVoices();
      }

      const data = await response.json();
      const voices: HeyGenVoice[] = [];

      if (data.data?.voices) {
        for (const voice of data.data.voices) {
          if (voice.language && voice.language.toLowerCase().startsWith(language)) {
            voices.push({
              voice_id: voice.voice_id,
              language: voice.language,
              gender: voice.gender || 'unknown',
              name: voice.display_name || voice.name || voice.voice_id,
              preview_audio: voice.preview_audio,
              support_pause: voice.support_pause ?? true,
              emotion_support: voice.emotion_support ?? false,
            });
          }
        }
      }

      this.logger.log(`Fetched ${voices.length} ${language} voices from HeyGen`);
      return voices.length > 0 ? voices : this.getFallbackVoices();
    } catch (error) {
      this.logger.error(`Error fetching HeyGen voices: ${error.message}`);
      return this.getFallbackVoices();
    }
  }

  /**
   * Get available scene templates.
   */
  getSceneTemplates(): { id: SceneTemplate; name: string; description: string }[] {
    return [
      {
        id: 'talking_head',
        name: 'Talking Head',
        description: 'Avatar en pantalla completa con fondo personalizado. Ideal para introducciones y módulos narrativos.',
      },
      {
        id: 'presenter',
        name: 'Presentador',
        description: 'Avatar de cuerpo medio con slides al fondo. Ideal para cursos educativos.',
      },
      {
        id: 'split_screen',
        name: 'Pantalla Dividida',
        description: 'Avatar a la izquierda (40%) + slides a la derecha (60%). Ideal para cursos técnicos.',
      },
      {
        id: 'pip',
        name: 'Picture-in-Picture',
        description: 'Slides en pantalla completa con avatar pequeño en esquina. Ideal para presentaciones con gráficos.',
      },
      {
        id: 'news_anchor',
        name: 'Noticiero',
        description: 'Layout estilo noticiero con banner inferior. Ideal para cursos de noticias y actualidad.',
      },
      {
        id: 'whiteboard',
        name: 'Pizarra',
        description: 'Avatar al costado con pizarra virtual. Ideal para explicaciones conceptuales.',
      },
    ];
  }

  /**
   * Create an Instant Avatar from a photo uploaded by the creator.
   */
  async createInstantAvatar(imageUrl: string, avatarName: string): Promise<{ avatar_id: string }> {
    if (!this.apiKey) {
      throw new Error('HEYGEN_API_KEY no configurada.');
    }

    const response = await fetch(`${this.apiUrl}/v2/photo_avatar`, {
      method: 'POST',
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        name: avatarName,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`HeyGen instant avatar failed: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    this.logger.log(`Instant avatar created: ${data.data?.talking_photo_id}`);
    return { avatar_id: data.data?.talking_photo_id };
  }

  /**
   * Generate a video with HeyGen avatar.
   */
  async generateVideo(options: HeyGenVideoOptions): Promise<string> {
    if (!this.apiKey) {
      throw new Error('HEYGEN_API_KEY no configurada.');
    }

    const {
      script,
      avatarId,
      avatarType = 'stock',
      avatarGender = 'female',
      heygenVoiceId,
      voice,
      voiceSource = 'heygen',
      emotion = 'neutral',
      speed = 1.0,
      sceneTemplate = 'talking_head',
      background = 'studio',
      outputDir,
      moduleOrder,
    } = options;

    this.logger.log(
      `[heygen] Creating video for module ${moduleOrder}, avatar: ${avatarId}, gender: ${avatarGender}, template: ${sceneTemplate}`,
    );

    // Build the video generation request
    const videoInput = this.buildVideoInput(
      script,
      avatarId,
      avatarType,
      voiceSource,
      heygenVoiceId,
      voice,
      emotion,
      speed,
      background,
      avatarGender,
    );

    const response = await fetch(`${this.apiUrl}/v2/video/generate`, {
      method: 'POST',
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(videoInput),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      this.logger.error(`[heygen] Video generation failed: ${JSON.stringify(error)}`);
      throw new Error(
        `HeyGen error: ${error.message || error.error || response.statusText}`,
      );
    }

    const data = await response.json();
    const videoId = data.data?.video_id;

    if (!videoId) {
      throw new Error('HeyGen did not return a video_id');
    }

    this.logger.log(`[heygen] Video job created: ${videoId}`);

    // Poll until done
    const videoUrl = await this.pollVideoStatus(videoId);
    this.logger.log(`[heygen] Video ready: ${videoUrl}`);

    // Download
    const outputPath = join(outputDir, 'video.mp4');
    await this.downloadVideo(videoUrl, outputPath);
    this.logger.log(`[heygen] Video saved: ${outputPath}`);

    return outputPath;
  }

  /**
   * Check the status of a video generation job.
   */
  async getVideoStatus(videoId: string): Promise<{
    status: string;
    video_url?: string;
    error?: string;
  }> {
    if (!this.apiKey) {
      throw new Error('HEYGEN_API_KEY no configurada.');
    }

    const response = await fetch(
      `${this.apiUrl}/v1/video_status.get?video_id=${videoId}`,
      {
        headers: {
          'X-Api-Key': this.apiKey,
          'Accept': 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HeyGen status check failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      status: data.data?.status || 'unknown',
      video_url: data.data?.video_url,
      error: data.data?.error,
    };
  }

  /**
   * Generate a 15-second preview with the given configuration.
   */
  async generatePreview(
    avatarId: string,
    avatarType: string,
    voiceId?: string,
    text: string = 'Hola, soy tu instructor para este curso. Vamos a aprender juntos.',
  ): Promise<{ video_id: string }> {
    if (!this.apiKey) {
      throw new Error('HEYGEN_API_KEY no configurada.');
    }

    const videoInput = this.buildVideoInput(
      text,
      avatarId,
      avatarType as 'stock' | 'instant' | 'photo',
      voiceId ? 'heygen' : 'edge_tts',
      voiceId,
      'es-CO-GonzaloNeural',
      'neutral',
      1.0,
      'studio',
    );

    const response = await fetch(`${this.apiUrl}/v2/video/generate`, {
      method: 'POST',
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(videoInput),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`HeyGen preview failed: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return { video_id: data.data?.video_id };
  }

  // ─── Private helpers ──────────────────────────────────────────────

  private buildVideoInput(
    script: string,
    avatarId: string | undefined,
    avatarType: 'stock' | 'instant' | 'photo',
    voiceSource: 'heygen' | 'edge_tts',
    heygenVoiceId?: string,
    edgeTtsVoice?: string,
    emotion: string = 'neutral',
    speed: number = 1.0,
    background: string = 'studio',
    avatarGender: 'male' | 'female' = 'female',
  ) {
    // Determine avatar configuration based on type
    const avatarConfig: Record<string, unknown> =
      avatarType === 'instant' || avatarType === 'photo'
        ? { type: 'talking_photo', talking_photo_id: avatarId }
        : { type: 'avatar', avatar_id: avatarId || 'Abigail_expressive_2024112501' };

    // Voice configuration — always use a valid HeyGen voice_id, matching avatar gender
    const defaultVoice = avatarGender === 'male'
      ? this.defaultHeyGenVoiceMale
      : this.defaultHeyGenVoiceFemale;
    const resolvedVoiceId = heygenVoiceId || defaultVoice;
    const voiceConfig: Record<string, unknown> = {
      type: 'text',
      input_text: script.substring(0, 5000),
      voice_id: resolvedVoiceId,
      speed,
    };

    // Add emotion if supported
    if (emotion !== 'neutral') {
      (voiceConfig as Record<string, unknown>).emotion = emotion;
    }

    // Background configuration
    const backgroundConfig = this.getBackgroundConfig(background);

    return {
      video_inputs: [
        {
          character: avatarConfig,
          voice: voiceConfig,
          background: backgroundConfig,
        },
      ],
      dimension: { width: 1920, height: 1080 },
    };
  }

  private getBackgroundConfig(background: string): Record<string, unknown> {
    const backgrounds: Record<string, Record<string, unknown>> = {
      office: { type: 'template', template_id: 'office' },
      classroom: { type: 'template', template_id: 'classroom' },
      studio: { type: 'color', color: '#1a1a2e' },
      gradient: { type: 'color', color: '#0f3460' },
      white: { type: 'color', color: '#ffffff' },
    };

    return backgrounds[background] || backgrounds.studio;
  }

  private async pollVideoStatus(
    videoId: string,
    maxAttempts = 120,
    intervalMs = 5000,
  ): Promise<string> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.sleep(intervalMs);

      try {
        const status = await this.getVideoStatus(videoId);
        this.logger.log(`[heygen] Poll ${attempt + 1}: status=${status.status}`);

        if (status.status === 'completed' && status.video_url) {
          return status.video_url;
        }

        if (status.status === 'failed') {
          throw new Error(`HeyGen video failed: ${status.error || 'Unknown error'}`);
        }
      } catch (error) {
        if (error.message.includes('HeyGen video failed')) {
          throw error;
        }
        this.logger.warn(`[heygen] Poll attempt ${attempt + 1} error: ${error.message}`);
      }
    }

    throw new Error('HeyGen video generation timed out after 10 minutes');
  }

  private async downloadVideo(url: string, outputPath: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download HeyGen video: ${response.statusText}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    writeFileSync(outputPath, buffer);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getFallbackAvatars(): HeyGenAvatar[] {
    return [
      {
        avatar_id: 'Angela-inTshirt-20220820',
        avatar_name: 'Angela',
        gender: 'female',
        preview_image_url: 'https://files.heygen.ai/avatar/v3/Angela-inTshirt-20220820.jpg',
        type: 'stock',
      },
      {
        avatar_id: 'Tyler-incasualsuit-20220721',
        avatar_name: 'Tyler',
        gender: 'male',
        preview_image_url: 'https://files.heygen.ai/avatar/v3/Tyler-incasualsuit-20220721.jpg',
        type: 'stock',
      },
      {
        avatar_id: 'Anna_public_3_20240108',
        avatar_name: 'Anna',
        gender: 'female',
        preview_image_url: 'https://files.heygen.ai/avatar/v3/Anna_public_3_20240108.jpg',
        type: 'stock',
      },
      {
        avatar_id: 'josh_lite3_20230714',
        avatar_name: 'Josh',
        gender: 'male',
        preview_image_url: 'https://files.heygen.ai/avatar/v3/josh_lite3_20230714.jpg',
        type: 'stock',
      },
      {
        avatar_id: 'Kayla-incasualsuit-20220818',
        avatar_name: 'Kayla',
        gender: 'female',
        preview_image_url: 'https://files.heygen.ai/avatar/v3/Kayla-incasualsuit-20220818.jpg',
        type: 'stock',
      },
      {
        avatar_id: 'Marco_public_20240510',
        avatar_name: 'Marco',
        gender: 'male',
        preview_image_url: 'https://files.heygen.ai/avatar/v3/Marco_public_20240510.jpg',
        type: 'stock',
      },
    ];
  }

  private getFallbackVoices(): HeyGenVoice[] {
    return [
      {
        voice_id: 'es_male_carlos',
        language: 'es-ES',
        gender: 'male',
        name: 'Carlos (Español)',
        support_pause: true,
        emotion_support: true,
      },
      {
        voice_id: 'es_female_sofia',
        language: 'es-ES',
        gender: 'female',
        name: 'Sofía (Español)',
        support_pause: true,
        emotion_support: true,
      },
      {
        voice_id: 'es_male_diego',
        language: 'es-MX',
        gender: 'male',
        name: 'Diego (México)',
        support_pause: true,
        emotion_support: false,
      },
      {
        voice_id: 'es_female_valentina',
        language: 'es-CO',
        gender: 'female',
        name: 'Valentina (Colombia)',
        support_pause: true,
        emotion_support: true,
      },
    ];
  }
}
