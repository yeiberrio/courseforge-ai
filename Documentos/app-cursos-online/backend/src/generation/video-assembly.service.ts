import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

const execFileAsync = promisify(execFile);

@Injectable()
export class VideoAssemblyService {
  private readonly logger = new Logger(VideoAssemblyService.name);

  /**
   * Assemble slides (SVG images) + audio (MP3) into a video (MP4).
   * Uses ffmpeg to combine them.
   */
  async assembleVideo(options: {
    slidesDir: string;
    audioPath: string;
    outputPath: string;
  }): Promise<string> {
    const { slidesDir, audioPath, outputPath } = options;

    // Get slide files sorted
    const slides = readdirSync(slidesDir)
      .filter((f) => f.endsWith('.svg'))
      .sort();

    if (slides.length === 0) {
      throw new Error('No slides found');
    }

    if (!existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    // Get audio duration
    const duration = await this.getAudioDuration(audioPath);
    const secondsPerSlide = Math.max(5, Math.floor(duration / slides.length));

    this.logger.log(
      `Assembling video: ${slides.length} slides, ${duration}s audio, ${secondsPerSlide}s/slide`,
    );

    // Build ffmpeg concat file for slides with duration
    const concatContent = slides
      .map((s) => `file '${join(slidesDir, s)}'\nduration ${secondsPerSlide}`)
      .join('\n');
    // Add last slide again (ffmpeg concat requirement)
    const lastSlide = slides[slides.length - 1];
    const concatFile = join(slidesDir, 'concat.txt');
    require('fs').writeFileSync(
      concatFile,
      concatContent + `\nfile '${join(slidesDir, lastSlide)}'`,
    );

    try {
      // Assemble: slides + audio → MP4
      await execFileAsync(
        'ffmpeg',
        [
          '-y',
          '-f', 'concat',
          '-safe', '0',
          '-i', concatFile,
          '-i', audioPath,
          '-c:v', 'libx264',
          '-tune', 'stillimage',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-shortest',
          '-vf', 'scale=1920:1080',
          outputPath,
        ],
        { timeout: 300000 }, // 5 min timeout
      );

      if (!existsSync(outputPath)) {
        throw new Error('Video file not created');
      }

      this.logger.log(`Video assembled: ${outputPath}`);
      return outputPath;
    } catch (error) {
      this.logger.error(`Video assembly failed: ${error.message}`);
      throw error;
    }
  }

  private async getAudioDuration(audioPath: string): Promise<number> {
    try {
      const { stdout } = await execFileAsync('ffprobe', [
        '-v', 'quiet',
        '-show_entries', 'format=duration',
        '-of', 'csv=p=0',
        audioPath,
      ]);
      return Math.ceil(parseFloat(stdout.trim()));
    } catch {
      // Fallback: estimate 150 words/min
      return 60;
    }
  }
}
