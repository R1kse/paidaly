import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ModifierGroupType } from '@prisma/client';

export class CreateModifierGroupDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsEnum(ModifierGroupType)
  type!: ModifierGroupType;

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
