import { IsEmail, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

/** Mediator / email pipeline → grant credits (secret header, no user JWT). */
export class ManualCreditDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(200)
  external_payment_id!: string;

  @IsInt()
  @Min(1)
  @Max(50_000)
  credits!: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  plan_code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  source?: string;
}
