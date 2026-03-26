import { IsUUID, IsInt, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProgressDto {
  @ApiProperty()
  @IsUUID()
  module_id: string;

  @ApiProperty({ example: 120 })
  @IsInt()
  @Min(0)
  watched_seconds: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
