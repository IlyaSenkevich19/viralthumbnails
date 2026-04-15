import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';

function toOptionalBool(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true;
    if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false;
  }
  return undefined;
}

export class ThumbnailPipelineRunVideoDto {
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : value))
  @IsString()
  @IsUrl({ require_tld: false })
  videoUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  count?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  style?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : value))
  @IsString()
  @MaxLength(4000)
  prompt?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : value))
  @IsString()
  @MaxLength(128)
  template_id?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : value))
  @IsString()
  @MaxLength(128)
  avatar_id?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalBool(value))
  @IsBoolean()
  prioritize_face?: boolean;
}
