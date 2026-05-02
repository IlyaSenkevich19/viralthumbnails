import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RefineThumbnailDto {
  @IsString()
  @MinLength(8)
  @MaxLength(2500)
  instruction!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  template_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  avatar_id?: string;
}
