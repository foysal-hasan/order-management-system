import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, Min, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from 'src/generated/prisma/enums';


export class OrderItemDto {
  @ApiProperty({ example: 'prod_cl09x8...', description: 'ID of the product' })
  @IsString()
  @IsNotEmpty()
  product_id: string;

  @ApiProperty({ example: 2, description: 'Quantity for this specific product' })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
 
  customer_id?: string;

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.CASH_ON_DELIVERY })
  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}