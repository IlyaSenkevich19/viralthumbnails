import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  style?: string;
}
