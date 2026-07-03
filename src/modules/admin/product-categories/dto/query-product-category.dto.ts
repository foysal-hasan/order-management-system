import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ProductCategoryQueryDto {
  @ApiPropertyOptional({ 
    example: 'Tech', 
    description: 'Search keyword to filter categories by name or description' 
  })
  @IsOptional()
  @IsString()
  search?: string;
}