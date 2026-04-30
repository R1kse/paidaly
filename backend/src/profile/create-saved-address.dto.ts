import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSavedAddressDto {
  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsString()
  @IsNotEmpty()
  addressText!: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
