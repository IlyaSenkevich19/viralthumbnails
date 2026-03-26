import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
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
}
