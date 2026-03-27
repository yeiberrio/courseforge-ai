import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateCourseDto {
  @ApiProperty({ description: 'Path del archivo subido (de analyze-document)' })
  @IsString()
  filePath: string;

  @ApiProperty({ description: 'ID de la categoría del curso' })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({ default: 'es-CO-GonzaloNeural', description: 'Voz para el TTS' })
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

  @ApiPropertyOptional({ enum: ['slides', 'avatar'], default: 'slides', description: 'Tipo de video: slides (presentación) o avatar (persona IA)' })
  @IsOptional()
  @IsString()
  videoType?: 'slides' | 'avatar';

  @ApiPropertyOptional({ description: 'ID del avatar D-ID (solo para videoType=avatar)' })
  @IsOptional()
  @IsString()
  avatarId?: string;
}
