import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { basename, extname } from 'path';

const BUCKET_NAME = process.env.SUPABASE_BUCKET || 'course-videos';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private client: SupabaseClient | null = null;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (url && key) {
      this.client = createClient(url, key);
      this.logger.log('Supabase Storage initialized');
      this.ensureBucket();
    } else {
      this.logger.warn('Supabase Storage NOT configured — videos will only be stored locally');
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  private async ensureBucket() {
    if (!this.client) return;
    try {
      const { data } = await this.client.storage.getBucket(BUCKET_NAME);
      if (!data) {
        await this.client.storage.createBucket(BUCKET_NAME, {
          public: true,
          fileSizeLimit: 50 * 1024 * 1024, // 50MB
          allowedMimeTypes: ['video/mp4', 'audio/mpeg', 'audio/mp3', 'image/svg+xml', 'image/png'],
        });
        this.logger.log(`Bucket "${BUCKET_NAME}" created`);
      }
    } catch (error) {
      this.logger.warn(`Bucket check/create failed: ${error.message}`);
    }
  }

  /**
   * Upload a local file to Supabase Storage.
   * Returns the public URL, or null if Supabase is not configured.
   */
  async uploadFile(localPath: string, storagePath: string): Promise<string | null> {
    if (!this.client) return null;

    try {
      const fileBuffer = readFileSync(localPath);
      const ext = extname(localPath).toLowerCase();
      const contentType =
        ext === '.mp4' ? 'video/mp4' :
        ext === '.mp3' ? 'audio/mpeg' :
        ext === '.svg' ? 'image/svg+xml' :
        ext === '.png' ? 'image/png' :
        'application/octet-stream';

      const { data, error } = await this.client.storage
        .from(BUCKET_NAME)
        .upload(storagePath, fileBuffer, {
          contentType,
          upsert: true,
        });

      if (error) {
        this.logger.error(`Upload failed for ${storagePath}: ${error.message}`);
        return null;
      }

      const { data: urlData } = this.client.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

      this.logger.log(`Uploaded: ${storagePath} → ${urlData.publicUrl}`);
      return urlData.publicUrl;
    } catch (error) {
      this.logger.error(`Upload error: ${error.message}`);
      return null;
    }
  }

  /**
   * Upload a video file and return its public URL.
   * Convenience wrapper with course/module path structure.
   */
  async uploadVideo(localPath: string, courseId: string, moduleOrder: number): Promise<string | null> {
    const storagePath = `generated/${courseId}/module_${moduleOrder}/video.mp4`;
    return this.uploadFile(localPath, storagePath);
  }

  /**
   * Upload an audio file and return its public URL.
   */
  async uploadAudio(localPath: string, courseId: string, moduleOrder: number): Promise<string | null> {
    const storagePath = `generated/${courseId}/module_${moduleOrder}/audio.mp3`;
    return this.uploadFile(localPath, storagePath);
  }
}
