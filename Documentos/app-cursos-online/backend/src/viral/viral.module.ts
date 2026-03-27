import { Module } from '@nestjs/common';
import { ViralController } from './viral.controller';
import { ViralService } from './viral.service';

@Module({
  controllers: [ViralController],
  providers: [ViralService],
  exports: [ViralService],
})
export class ViralModule {}
