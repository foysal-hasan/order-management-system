import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsEnum, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus, PaymentMethod } from 'src/generated/prisma/enums';

export class QueryOrderDto {
    @ApiPropertyOptional({ example: 1, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ example: 10, default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @ApiPropertyOptional({ enum: OrderStatus })
    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;

    @ApiPropertyOptional({ enum: PaymentMethod })
    @IsOptional()
    @IsEnum(PaymentMethod)
    payment_method?: PaymentMethod;

    @ApiPropertyOptional({ example: 'cust_98342' })
    @IsOptional()
    @IsString()
    customer_id?: string;

    @ApiPropertyOptional({ example: '2026-01-01' })
    @IsOptional()
    @IsDateString()
    start_date?: string;

    @ApiPropertyOptional({ example: '2026-12-31' })
    @IsOptional()
    @IsDateString()
    end_date?: string;

    @ApiPropertyOptional({
        example: 'createdAt_desc',
        description: 'Format: field_asc or field_desc (e.g., createdAt_asc, totalPrice_desc). Valid fields: createdAt, totalPrice'
    })
    @IsOptional()
    @IsString()
    sort?: string = 'createdAt_desc';
}