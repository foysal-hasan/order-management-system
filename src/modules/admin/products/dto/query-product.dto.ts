import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsString, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryProductDto {
    @ApiPropertyOptional({
        example: 1,
        default: 1,
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
        description: 'Number of products to return per page (1-100)'
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @ApiPropertyOptional({ example: 'Logitech' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ example: 'Electronics', description: 'Filter explicitly by Category Name' })
    @IsOptional()
    @IsString()
    category_name?: string;

    @ApiPropertyOptional({
        example: 'created_at__desc',
        default: 'created_at__desc',
        enum: ['created_at__desc', 'created_at__asc', 'price__desc', 'price__asc', 'name__asc', 'name__desc'],
        description: 'Sort criteria in the format: field__direction (Separated by two underscores)'
    })
    @IsOptional()
    @IsString()
    @IsIn(['created_at__desc', 'created_at__asc', 'price__desc', 'price__asc', 'name__asc', 'name__desc'])
    sort?: string = 'created_at__desc';
}