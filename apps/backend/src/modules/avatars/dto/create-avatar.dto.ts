import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAvatarDto {
  @ApiPropertyOptional({ example: 'Studio headshot' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiProperty({
    description: 'Base64 image (optionally with data:image/...;base64, prefix). Face photo, clear lighting.',
  })
  @IsString()
  @MinLength(10)
  imageBase64!: string;

  @ApiPropertyOptional({ example: 'image/jpeg' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  mimeType?: string;
}
