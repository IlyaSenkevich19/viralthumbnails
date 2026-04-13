import { IsString, MaxLength } from 'class-validator';

export class ParseVideoUrlQueryDto {
  @IsString()
  @MaxLength(2048)
  url!: string;
}

