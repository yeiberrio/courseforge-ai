import { IsString, IsOptional, IsInt, Min, Max, IsUUID, IsNumber, ValidateNested, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class HeyGenConfigDto {
  @ApiPropertyOptional({ enum: ['stock', 'instant', 'photo'], default: 'stock' })
  @IsOptional()
  @IsString()
  avatarType?: 'stock' | 'instant' | 'photo';

  @ApiPropertyOptional({ description: 'ID del avatar en HeyGen' })
  @IsOptional()
  @IsString()
  avatarId?: string;

  @ApiPropertyOptional({ enum: ['male', 'female'], default: 'female', description: 'Género del avatar (para seleccionar voz automáticamente)' })
  @IsOptional()
  @IsString()
  avatarGender?: 'male' | 'female';

  @ApiPropertyOptional({
    enum: ['presenter', 'split_screen', 'pip', 'talking_head', 'news_anchor', 'whiteboard'],
    default: 'talking_head',
  })
  @IsOptional()
  @IsString()
  sceneTemplate?: 'presenter' | 'split_screen' | 'pip' | 'talking_head' | 'news_anchor' | 'whiteboard';

  @ApiPropertyOptional({ enum: ['bottom_right', 'bottom_left', 'top_right', 'top_left'], default: 'bottom_right' })
  @IsOptional()
  @IsString()
  pipPosition?: 'bottom_right' | 'bottom_left' | 'top_right' | 'top_left';

  @ApiPropertyOptional({ default: 20, description: 'Tamaño del PiP (% del frame)' })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(40)
  pipSize?: number;

  @ApiPropertyOptional({ enum: ['office', 'classroom', 'studio', 'gradient', 'white'], default: 'studio' })
  @IsOptional()
  @IsString()
  background?: string;

  @ApiPropertyOptional({ description: 'URL de imagen de fondo personalizada' })
  @IsOptional()
  @IsString()
  backgroundCustomUrl?: string;

  @ApiPropertyOptional({ enum: ['heygen', 'edge_tts'], default: 'heygen' })
  @IsOptional()
  @IsString()
  voiceSource?: 'heygen' | 'edge_tts';

  @ApiPropertyOptional({ description: 'ID de la voz HeyGen' })
  @IsOptional()
  @IsString()
  heygenVoiceId?: string;

  @ApiPropertyOptional({ enum: ['neutral', 'enthusiastic', 'serious', 'warm'], default: 'neutral' })
  @IsOptional()
  @IsString()
  emotion?: 'neutral' | 'enthusiastic' | 'serious' | 'warm';

  @ApiPropertyOptional({ default: 1.0, description: 'Velocidad de habla (0.75 - 1.5)' })
  @IsOptional()
  @IsNumber()
  @Min(0.75)
  @Max(1.5)
  speed?: number;
}

export class GenerateCourseDto {
  @ApiProperty({ description: 'Path del archivo subido (de analyze-document)' })
  @IsString()
  filePath: string;

  @ApiProperty({ description: 'ID de la categoría del curso' })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({ default: 'es-CO-GonzaloNeural', description: 'Voz para el TTS (Edge TTS)' })
  @IsOptional()
  @IsString()
  voice?: string;

  @ApiPropertyOptional({ enum: ['minimal', 'branded', 'dark'], default: 'minimal' })
  @IsOptional()
  @IsString()
  slideStyle?: 'minimal' | 'branded' | 'dark';

  @ApiPropertyOptional({ default: 5, description: 'Duración objetivo por módulo (minutos)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  targetDurationMin?: number;

  @ApiPropertyOptional({
    enum: ['slides', 'avatar', 'heygen'],
    default: 'slides',
    description: 'Tipo de video: slides (presentación), avatar (D-ID), heygen (HeyGen avatar avanzado)',
  })
  @IsOptional()
  @IsString()
  videoType?: 'slides' | 'avatar' | 'heygen';

  @ApiPropertyOptional({ description: 'ID del avatar D-ID (solo para videoType=avatar)' })
  @IsOptional()
  @IsString()
  avatarId?: string;

  @ApiPropertyOptional({ description: 'Configuración avanzada de HeyGen (solo para videoType=heygen)', type: HeyGenConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => HeyGenConfigDto)
  heygenConfig?: HeyGenConfigDto;
}
