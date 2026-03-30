import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { TEMPLATE_NICHE_CODE_LIST } from '../constants/template-niches';

export class ListTemplatesQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by niche. Omit to return all templates.',
    enum: TEMPLATE_NICHE_CODE_LIST,
  })
  @IsOptional()
  @IsString()
  @IsIn(TEMPLATE_NICHE_CODE_LIST)
  niche?: string;

  @ApiPropertyOptional({ description: '1-based page index', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Page size (max 100)', minimum: 1, maximum: 100, default: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
