import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@courseforge.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin2026*' })
  @IsString()
  @MinLength(6)
  password: string;
}
