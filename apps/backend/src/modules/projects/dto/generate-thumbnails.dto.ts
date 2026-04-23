import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import type { ThumbnailFaceInImage } from '../../../common/thumbnail-prompt-guidelines';

function toOptionalBool(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return undefined;
}

export class GenerateThumbnailsDto {
  @ApiPropertyOptional({ description: 'Optional style / layout template id' })
  @IsOptional()
  @IsString()
  template_id?: string;

  @ApiPropertyOptional({ description: 'Face reference (user_avatars row); sent as image to the model' })
  @IsOptional()
  @IsUUID('4')
  avatar_id?: string;

  @ApiPropertyOptional({
    description: 'When true and avatar_id is set, prompt stresses recognizable likeness',
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalBool(value))
  @IsBoolean()
  prioritize_face?: boolean;

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  count?: number;

  @ApiPropertyOptional({
    enum: ['default', 'with_face', 'faceless'],
    description:
      'Whether the thumbnail should highlight an on-camera face, or be faceless. Face reference images are ignored when `faceless`.',
  })
  @IsOptional()
  @IsString()
  @IsIn(['default', 'with_face', 'faceless'] satisfies ThumbnailFaceInImage[])
  face_in_thumbnail?: ThumbnailFaceInImage;
}
