import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateModifierOptionDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  priceDelta?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @Min(0)
  sortOrder?: number;
}
