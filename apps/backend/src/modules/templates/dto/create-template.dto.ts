import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { TEMPLATE_NICHE_CODE_LIST } from '../constants/template-niches';

export class CreateTemplateDto {
  @ApiProperty({ example: 'Bold red frame' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'bold-red-frame' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters, numbers, and hyphens',
  })
  @MaxLength(80)
  slug!: string;

  @ApiProperty({
    description: 'Base64 image data (optionally with data:image/...;base64, prefix)',
  })
  @IsString()
  @MinLength(10)
  imageBase64!: string;

  @ApiPropertyOptional({ example: 'image/png' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  mimeType?: string;

  @ApiPropertyOptional({
    description: 'Niche for filtering in the catalog',
    enum: TEMPLATE_NICHE_CODE_LIST,
  })
  @IsOptional()
  @IsString()
  @IsIn(TEMPLATE_NICHE_CODE_LIST)
  niche?: string;
}
