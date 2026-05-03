import { Transform } from 'class-transformer';
import { Allow, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Public support message → Telegram ticket (no JWT). */
export class SupportContactDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsIn(['landing', 'app'])
  source!: 'landing' | 'app';

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  page_url?: string;

  /** Honeypot — must stay empty. */
  @Allow()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;
}
