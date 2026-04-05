import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

function toOptionalBool(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return undefined;
}

export class FromVideoBodyDto {
  @ApiPropertyOptional({ description: 'Public HTTPS URL to the video' })
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : value))
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  videoUrl?: string;

  @ApiPropertyOptional({ default: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  count?: number;

  @ApiPropertyOptional({ description: 'Short visual style hint (colors, typography mood)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  style?: string;

  @ApiPropertyOptional({
    description: 'Creative direction for analysis and thumbnail concepts (second prompt)',
    maxLength: 4000,
  })
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : value))
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  prompt?: string;

  @ApiPropertyOptional({ description: 'Layout template id (catalog slug or UUID)' })
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : value))
  @IsOptional()
  @IsString()
  @MaxLength(128)
  template_id?: string;

  @ApiPropertyOptional({ description: 'Face reference (user_avatars row)' })
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : value))
  @IsOptional()
  @IsUUID('4')
  avatar_id?: string;

  @ApiPropertyOptional({
    description: 'When true with avatar_id, stresses recognizable likeness in generation',
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalBool(value))
  @IsBoolean()
  prioritize_face?: boolean;
}
