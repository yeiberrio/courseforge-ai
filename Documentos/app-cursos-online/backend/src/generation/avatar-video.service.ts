import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { writeFileSync } from 'fs';
import { join } from 'path';

export interface AvatarVideoOptions {
  script: string;
  audioUrl?: string;
  avatarId?: string;
  outputDir: string;
  moduleOrder: number;
}

export interface DIDAvatar {
  id: string;
  name: string;
  gender: string;
  preview: string;
}

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

  /**
   * Get available D-ID presenters/avatars.
   */
  async getAvatars(): Promise<DIDAvatar[]> {
    // D-ID stock presenters - curated list of high-quality avatars
    return [
      { id: 'anna_costume1_cameraA', name: 'Anna', gender: 'female', preview: 'Professional woman, formal attire' },
      { id: 'amy-Aq6OmGZnMt', name: 'Amy', gender: 'female', preview: 'Young woman, casual style' },
      { id: 'josh_lite3_20230714', name: 'Josh', gender: 'male', preview: 'Professional man, formal attire' },
      { id: 'matt-beard_MhdJDmQVco', name: 'Matt', gender: 'male', preview: 'Man with beard, casual style' },
      { id: 'emma_f2_lite_20230609', name: 'Emma', gender: 'female', preview: 'Professional woman, modern look' },
    ];
  }

  /**
   * Generate a talking-head video using D-ID API.
   * Sends the script text and D-ID generates the video with lip-sync.
   */
  async generateAvatarVideo(options: AvatarVideoOptions): Promise<string> {
    if (!this.apiKey) {
      throw new Error('DID_API_KEY no configurada. Agrega la variable de entorno DID_API_KEY.');
    }

    const { script, avatarId, outputDir, moduleOrder } = options;

    this.logger.log(`[avatar] Creating talk for module ${moduleOrder}, avatar: ${avatarId || 'default'}`);

    // Step 1: Create a talk (video generation request)
    const talkResponse = await fetch(`${this.apiUrl}/talks`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_url: avatarId
          ? `https://create-images-results.d-id.com/api_docs/assets/${avatarId}/image.png`
          : 'https://create-images-results.d-id.com/api_docs/assets/anna_costume1_cameraA/image.png',
        script: {
          type: 'text',
          input: script.substring(0, 5000), // D-ID limit
          provider: {
            type: 'microsoft',
            voice_id: 'es-CO-GonzaloNeural',
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

    // Step 2: Poll until video is ready
    const videoUrl = await this.pollTalkStatus(talkId);
    this.logger.log(`[avatar] Video ready: ${videoUrl}`);

    // Step 3: Download the video
    const outputPath = join(outputDir, 'video.mp4');
    await this.downloadVideo(videoUrl, outputPath);
    this.logger.log(`[avatar] Video saved: ${outputPath}`);

    return outputPath;
  }

  /**
   * Generate avatar video using pre-generated audio file instead of D-ID TTS.
   */
  async generateAvatarVideoWithAudio(
    audioUrl: string,
    avatarId: string | undefined,
    outputDir: string,
    moduleOrder: number,
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('DID_API_KEY no configurada.');
    }

    this.logger.log(`[avatar] Creating talk with audio for module ${moduleOrder}`);

    const talkResponse = await fetch(`${this.apiUrl}/talks`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_url: avatarId
          ? `https://create-images-results.d-id.com/api_docs/assets/${avatarId}/image.png`
          : 'https://create-images-results.d-id.com/api_docs/assets/anna_costume1_cameraA/image.png',
        script: {
          type: 'audio',
          audio_url: audioUrl,
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
      this.logger.error(`[avatar] D-ID create talk (audio) failed: ${JSON.stringify(error)}`);
      throw new Error(`D-ID error: ${error.message || error.description || talkResponse.statusText}`);
    }

    const talkData = await talkResponse.json();
    const talkId = talkData.id;
    this.logger.log(`[avatar] Talk created (audio): ${talkId}`);

    const videoUrl = await this.pollTalkStatus(talkId);

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
      await this.sleep(5000); // Wait 5 seconds between polls

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
        throw new Error(`D-ID video generation failed: ${data.error?.description || 'Unknown error'}`);
      }
    }

    throw new Error('D-ID video generation timed out after 5 minutes');
  }

  /**
   * Download video from URL to local file.
   */
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
