import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/** Reserved for future explicit variant creation (manual upload, etc.). */
export class CreateThumbnailVariantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  template_id?: string;
}
