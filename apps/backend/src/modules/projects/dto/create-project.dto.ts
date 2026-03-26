import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProjectSourceType } from './project-source-type.enum';

export class CreateProjectDto {
  @ApiPropertyOptional({ example: 'My summer vlog thumbnails' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'youtube' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  platform?: string;

  @ApiProperty({ enum: ProjectSourceType })
  @IsEnum(ProjectSourceType)
  source_type!: ProjectSourceType;

  @ApiProperty({
    example: { url: 'https://www.youtube.com/watch?v=...' },
    description: 'Payload for the source (e.g. url, file path key, text, script)',
  })
  @IsObject()
  source_data!: Record<string, unknown>;
}
