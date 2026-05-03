import { LeadIntakeFieldsDto } from '../../lead-crm/dto/lead-intake-fields.dto';

/**
 * Authenticated lead qualification — email comes from Supabase JWT, not the body.
 * CRM row shape matches {@link PublicLeadIntakeDto}.
 */
export class CompleteLeadQualificationDto extends LeadIntakeFieldsDto {}
