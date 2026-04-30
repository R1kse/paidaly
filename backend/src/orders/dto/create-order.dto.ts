import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { DeliveryType, PaymentMethod } from '@prisma/client';

export class CreateOrderItemDto {
  @IsString()
  menuItemId!: string;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modifierOptionIds?: string[];
}

export class CreateOrderDto {
  @IsEnum(DeliveryType)
  deliveryType!: DeliveryType;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  scheduledFor?: string;

  @IsOptional()
  @IsString()
  addressText?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  addressLat?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  addressLng?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
