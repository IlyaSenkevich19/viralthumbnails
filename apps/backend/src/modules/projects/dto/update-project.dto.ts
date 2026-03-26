import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    enum: ['draft', 'pending', 'generating', 'done', 'failed'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  source_data?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Preview image for project cards' })
  @IsOptional()
  @IsString()
  cover_thumbnail_url?: string;
}
