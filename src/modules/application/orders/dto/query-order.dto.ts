import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsEnum, IsString, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from 'src/generated/prisma/enums';

export class QueryOrderDto {
    @ApiPropertyOptional({
        example: 1,
        default: 1,
        minimum: 1,
        description: 'Page number for pagination (1-based index)'
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({
        example: 10,
        default: 10,
        minimum: 1,
        maximum: 100,
        description: 'Number of items per page (1-100)'
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @ApiPropertyOptional({ enum: OrderStatus, description: 'Filter orders by status' })
    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;

    @ApiPropertyOptional({ 
        example: 'createdAt_desc', 
        description: 'Format: field_asc or field_desc (e.g., createdAt_asc, totalPrice_desc). Valid fields: createdAt, totalPrice' 
    })
    @IsOptional()
    @IsString()
    sort?: string = 'createdAt_desc';
}