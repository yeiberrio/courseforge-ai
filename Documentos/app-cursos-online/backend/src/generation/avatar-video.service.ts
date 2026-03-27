import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { writeFileSync } from 'fs';
import { join } from 'path';

export interface AvatarVideoOptions {
  script: string;
  voice?: string;
  avatarId?: string;
  outputDir: string;
  moduleOrder: number;
}

export interface DIDAvatar {
  id: string;
  name: string;
  gender: string;
  preview: string;
  imageUrl: string;
}

// D-ID public sample images that are confirmed to work
const AVATARS: DIDAvatar[] = [
  {
    id: 'alice',
    name: 'Alice',
    gender: 'female',
    preview: 'Mujer profesional, cabello rubio',
    imageUrl: 'https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg',
  },
  {
    id: 'alex',
    name: 'Alex',
    gender: 'male',
    preview: 'Hombre joven, estilo casual',
    imageUrl: 'https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alex.jpg',
  },
  {
    id: 'emma',
    name: 'Emma',
    gender: 'female',
    preview: 'Mujer joven, look moderno',
    imageUrl: 'https://d-id-public-bucket.s3.us-west-2.amazonaws.com/emma.jpg',
  },
  {
    id: 'jack',
    name: 'Jack',
    gender: 'male',
    preview: 'Hombre profesional, formal',
    imageUrl: 'https://d-id-public-bucket.s3.us-west-2.amazonaws.com/jack.jpg',
  },
  {
    id: 'lisa',
    name: 'Lisa',
    gender: 'female',
    preview: 'Mujer, estilo ejecutivo',
    imageUrl: 'https://d-id-public-bucket.s3.us-west-2.amazonaws.com/lisa.jpg',
  },
];

@Injectable()
export class AvatarVideoService {
  private readonly logger = new Logger(AvatarVideoService.name);
  private readonly apiKey: string | undefined;
  private readonly apiUrl = 'https://api.d-id.com';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DID_API_KEY');
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async getAvatars(): Promise<DIDAvatar[]> {
    return AVATARS;
  }

  private getAvatarImageUrl(avatarId?: string): string {
    const avatar = AVATARS.find((a) => a.id === avatarId);
    return avatar?.imageUrl || AVATARS[0].imageUrl;
  }

  /**
   * Generate a talking-head video using D-ID API.
   */
  async generateAvatarVideo(options: AvatarVideoOptions): Promise<string> {
    if (!this.apiKey) {
      throw new Error('DID_API_KEY no configurada.');
    }

    const { script, voice, avatarId, outputDir, moduleOrder } = options;
    const imageUrl = this.getAvatarImageUrl(avatarId);

    this.logger.log(`[avatar] Creating talk for module ${moduleOrder}, avatar: ${avatarId || 'alice'}, image: ${imageUrl}`);

    const talkResponse = await fetch(`${this.apiUrl}/talks`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_url: imageUrl,
        script: {
          type: 'text',
          input: script.substring(0, 5000),
          provider: {
            type: 'microsoft',
            voice_id: voice || 'es-CO-GonzaloNeural',
          },
        },
        config: {
          fluent: true,
          pad_audio: 0.5,
          stitch: true,
        },
      }),
    });

    if (!talkResponse.ok) {
      const error = await talkResponse.json().catch(() => ({}));
      this.logger.error(`[avatar] D-ID create talk failed: ${JSON.stringify(error)}`);
      throw new Error(`D-ID error: ${error.message || error.description || talkResponse.statusText}`);
    }

    const talkData = await talkResponse.json();
    const talkId = talkData.id;
    this.logger.log(`[avatar] Talk created: ${talkId}`);

    const videoUrl = await this.pollTalkStatus(talkId);
    this.logger.log(`[avatar] Video ready: ${videoUrl}`);

    const outputPath = join(outputDir, 'video.mp4');
    await this.downloadVideo(videoUrl, outputPath);
    this.logger.log(`[avatar] Video saved: ${outputPath}`);

    return outputPath;
  }

  /**
   * Poll D-ID API until the talk video is ready.
   */
  private async pollTalkStatus(talkId: string, maxAttempts = 60): Promise<string> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.sleep(5000);

      const response = await fetch(`${this.apiUrl}/talks/${talkId}`, {
        headers: {
          'Authorization': `Basic ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        this.logger.warn(`[avatar] Poll attempt ${attempt + 1} failed: ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      this.logger.log(`[avatar] Poll ${attempt + 1}: status=${data.status}`);

      if (data.status === 'done' && data.result_url) {
        return data.result_url;
      }

      if (data.status === 'error' || data.status === 'rejected') {
        throw new Error(`D-ID video failed: ${data.error?.description || 'Unknown error'}`);
      }
    }

    throw new Error('D-ID video generation timed out after 5 minutes');
  }

  private async downloadVideo(url: string, outputPath: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    writeFileSync(outputPath, buffer);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
