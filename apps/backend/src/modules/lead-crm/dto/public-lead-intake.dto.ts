import { IsOptional, IsString, MaxLength } from 'class-validator';
import { LeadIntakeFieldsDto } from './lead-intake-fields.dto';

/** Anonymous lead intake (no JWT). Same CRM row shape as authenticated flow. */
export class PublicLeadIntakeDto extends LeadIntakeFieldsDto {
  @IsOptional()
  @IsString()
  @MaxLength(320)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  funnel_stage?: string;
}
