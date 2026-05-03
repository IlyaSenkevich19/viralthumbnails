import { Allow, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** Shared CRM payload fields (Google Apps Script `leads` sheet). */
export class LeadIntakeFieldsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  lead_session_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  channel_url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  biggest_thumbnail_problem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subscriber_count?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  videos_per_week?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  utm_source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  utm_medium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  utm_campaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  utm_content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  utm_term?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  gclid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  fbclid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  referrer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  page_path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  source?: string;

  /** Honeypot — must be empty when `reject` mode is used. */
  @Allow()
  @IsOptional()
  company?: string;
}
