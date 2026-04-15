import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ThumbnailPipelineRunDto {
  @IsString()
  @MinLength(3)
  @MaxLength(8000)
  user_prompt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  style?: string;

  /** Resolved playable HTTPS URL (e.g. signed URL after upload). */
  @IsOptional()
  @IsString()
  @MaxLength(12_000)
  video_url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  template_reference_data_urls?: string[];

  /** Optional template catalog id (UUID or synthetic id) resolved server-side. */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  template_id?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  face_reference_data_urls?: string[];

  /** Optional avatar row id resolved server-side to a face reference image. */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  avatar_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  variant_count?: number;

  @IsOptional()
  @IsBoolean()
  generate_images?: boolean;

  @IsOptional()
  @IsBoolean()
  prioritize_face?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(25_000_000)
  base_image_data_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  edit_instruction?: string;

  /** When true, save generated variants into `projects` + `thumbnail_variants`. */
  @IsOptional()
  @IsBoolean()
  persist_project?: boolean;
}
