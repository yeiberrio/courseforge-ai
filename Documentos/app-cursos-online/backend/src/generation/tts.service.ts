import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';

const execFileAsync = promisify(execFile);

export interface TtsOptions {
  text: string;
  outputPath: string;
  voice?: string; // Default: es-CO-GonzaloNeural
}

// Available Spanish voices in Edge TTS:
// es-CO-GonzaloNeural (male, Colombia)
// es-CO-SalomeNeural (female, Colombia)
// es-MX-JorgeNeural (male, Mexico)
// es-MX-DaliaNeural (female, Mexico)
// es-ES-AlvaroNeural (male, Spain)
// es-ES-ElviraNeural (female, Spain)
// es-AR-TomasNeural (male, Argentina)

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);

  async generateAudio(options: TtsOptions): Promise<string> {
    const { text, outputPath, voice = 'es-CO-GonzaloNeural' } = options;

    this.logger.log(`Generating audio: ${text.substring(0, 50)}... → ${outputPath}`);

    try {
      await execFileAsync('python3', [
        '-m', 'edge_tts',
        '--text', text,
        '--voice', voice,
        '--write-media', outputPath,
      ], { timeout: 60000 });

      if (!existsSync(outputPath)) {
        throw new Error(`Audio file not created: ${outputPath}`);
      }

      this.logger.log(`Audio generated: ${outputPath}`);
      return outputPath;
    } catch (error) {
      this.logger.error(`TTS generation failed: ${error.message}`);
      throw error;
    }
  }

  async listVoices(): Promise<string[]> {
    try {
      const { stdout } = await execFileAsync('python3', [
        '-m', 'edge_tts', '--list-voices',
      ], { timeout: 15000 });

      return stdout
        .split('\n')
        .filter((line) => line.startsWith('Name:') && line.includes('es-'))
        .map((line) => line.replace('Name: ', '').trim());
    } catch {
      return [
        'es-CO-GonzaloNeural',
        'es-CO-SalomeNeural',
        'es-MX-JorgeNeural',
        'es-MX-DaliaNeural',
        'es-ES-AlvaroNeural',
        'es-ES-ElviraNeural',
      ];
    }
  }
}
