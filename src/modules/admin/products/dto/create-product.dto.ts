import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsUrl, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Wireless Mechanical Keyboard', description: 'Product name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'https://example.com/keyboard.jpg', description: 'Product image URL' })
  @IsUrl()
  @IsNotEmpty()
  image: string;

  @ApiProperty({ example: 89.99, description: 'Product retail price' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 50, description: 'Stock availability count' })
  @IsNumber()
  @Min(0)
  stock_quantity: number;

  @ApiProperty({ example: 'Electronics', description: 'The exact unique Name of the Category' })
  @IsString()
  @IsNotEmpty()
  category_name: string;
}