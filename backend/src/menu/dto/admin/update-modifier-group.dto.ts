import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, Min } from 'class-validator';
import { ModifierGroupType } from '@prisma/client';

export class UpdateModifierGroupDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(ModifierGroupType)
  type?: ModifierGroupType;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @Min(0)
  minSelected?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @Min(1)
  maxSelected?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @Min(0)
  sortOrder?: number;
}
