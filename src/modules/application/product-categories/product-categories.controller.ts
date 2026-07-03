import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { ProductCategoriesService } from './product-categories.service';
import { TransformResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { ProductCategoryQueryDto } from './dto/query-product-category.dto';

@ApiTags('Application / Product Categories')
@Controller('product_categories')
@UseInterceptors(TransformResponseInterceptor)
export class ProductCategoriesController {
  constructor(private readonly service: ProductCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all product categories with optional search' })
  @ApiResponse({ status: 200, description: 'List of product categories.' })
  findAll(@Query() query: ProductCategoryQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':name')
  @ApiOperation({ summary: 'Get details of a single product category' })
  @ApiResponse({ status: 200, description: 'Product category details retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  findOne(@Param('name') name: string) {
    return this.service.findOne(name);
  }
}