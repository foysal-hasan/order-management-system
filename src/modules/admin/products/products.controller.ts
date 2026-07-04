import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';
import { QueryProductDto } from './dto/query-product.dto';
import { TransformResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@ApiTags('Admin / Products')
@ApiBearerAuth()
@Controller('admin/products')
@UseInterceptors(TransformResponseInterceptor)
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new catalog product using category name' })
  @ApiResponse({ status: 201, description: 'Product created successfully.' })
  @ApiResponse({ status: 409, description: 'Product already exists.' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  @ApiOperation({ summary: 'List products with queries (Admin)' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully.' })
  findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get product layout by slug (Admin)' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  findOne(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Patch(':slug')
  @ApiOperation({ summary: 'Update a product structure by unique slug identifier' })
  @ApiResponse({ status: 200, description: 'Product updated successfully.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  update(@Param('slug') slug: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(slug, updateProductDto);
  }

  @Delete(':slug')
  @ApiOperation({ summary: 'Delete a product from records by slug' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  remove(@Param('slug') slug: string) {
    return this.productsService.remove(slug);
  }
}