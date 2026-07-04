import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrderStatus } from 'src/generated/prisma/enums';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PROCESSING })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}