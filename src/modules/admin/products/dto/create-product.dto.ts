import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsNumber, IsUrl, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Wireless Mechanical Keyboard', description: 'Product name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Image file for the product',
    type: 'string',
    format: 'binary',
    required: true,
  })
  image_file: File;

  image?: string;

  @ApiProperty({ example: 89.99, description: 'Product retail price' })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 50, description: 'Stock availability count' })
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(0)
  stock_quantity: number;

  @ApiProperty({ example: 'Electronics', description: 'The exact unique Name of the Category' })
  @IsString()
  @IsNotEmpty()
  category_name: string;
}