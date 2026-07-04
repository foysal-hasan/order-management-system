import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {  ProductsService } from './products.service';
import { QueryProductDto } from './dto/query-product.dto';
import { TransformResponseInterceptor } from 'src/common/interceptors/response.interceptor';

@ApiTags('Application / Products')
@Controller('products')
@UseInterceptors(TransformResponseInterceptor)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Get products with pagination, category filtering (by Name), and text search' })
  async findAll(@Query() query: QueryProductDto) {
    const result = await this.productsService.findAll(query);
    result.items?.forEach((product) => {
      if (product.image) {
        
      }
    });
    return result;
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get product details via slug identification' })
  @ApiResponse({ status: 200, description: 'Product payload returned.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  findOne(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }
}