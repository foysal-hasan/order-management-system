import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProductCategoryDto {
  @ApiProperty({ example: 'Electronics', description: 'The unique name of the category' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ 
    example: 'Gadgets, devices, and electronic accessories', 
    description: 'A brief description of the category' 
  })
  @IsOptional()
  @IsString()
  description?: string;
}
