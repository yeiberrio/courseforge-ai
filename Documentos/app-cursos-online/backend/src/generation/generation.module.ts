import { Module } from '@nestjs/common';
import { GenerationService } from './generation.service';
import { GenerationController } from './generation.controller';
import { TtsService } from './tts.service';
import { SlideService } from './slide.service';
import { VideoAssemblyService } from './video-assembly.service';
import { ScriptGeneratorService } from './script-generator.service';
import { DocumentParserService } from './document-parser.service';
import { AvatarVideoService } from './avatar-video.service';
import { HeyGenVideoService } from './heygen-video.service';
import { StorageService } from './storage.service';

@Module({
  controllers: [GenerationController],
  providers: [
    GenerationService,
    TtsService,
    SlideService,
    VideoAssemblyService,
    ScriptGeneratorService,
    DocumentParserService,
    AvatarVideoService,
    HeyGenVideoService,
    StorageService,
  ],
  exports: [GenerationService, StorageService],
})
export class GenerationModule {}
