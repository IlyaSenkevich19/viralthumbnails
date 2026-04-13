import { IsString, IsUrl, MaxLength } from 'class-validator';

export class GetVideoMetaDto {
  @IsString()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  video_url!: string;
}

