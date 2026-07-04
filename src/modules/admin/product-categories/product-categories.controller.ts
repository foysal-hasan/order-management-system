import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProductCategoriesService } from './product-categories.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { ProductCategoryQueryDto } from './dto/query-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { TransformResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { UserType } from 'src/generated/prisma/enums';


@ApiTags('Admin / Product Categories')
@ApiBearerAuth()
@Controller('admin/product-categories')
@UseInterceptors(TransformResponseInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.ADMIN)
export class ProductCategoriesController {
  constructor(private readonly adminService: ProductCategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product category (Admin)' })
  @ApiResponse({ status: 201, description: 'Category created successfully.' })
  @ApiResponse({ status: 409, description: 'Category name already exists.' })
  create(@Body() createCategoryDto: CreateProductCategoryDto) {
    return this.adminService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all categories with optional search (Admin)' })
  findAll(@Query() query: ProductCategoryQueryDto) {
    return this.adminService.findAll(query);
  }

  @Get(':name')
  @ApiOperation({ summary: 'Get category detail by name (Admin)' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  findOne(@Param('name') name: string) {
    return this.adminService.findOne(name);
  }

  @Patch(':name')
  @ApiOperation({ summary: 'Update a category by name (Admin)' })
  @ApiResponse({ status: 200, description: 'Category updated successfully.' })
  update(@Param('name') name: string, @Body() updateCategoryDto: UpdateProductCategoryDto) {
    return this.adminService.update(name, updateCategoryDto);
  }

  @Delete(':name')
  @ApiOperation({ summary: 'Delete a category by name (Admin)' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully.' })
  @ApiResponse({ status: 409, description: 'Cannot delete category containing active products.' })
  remove(@Param('name') name: string) {
    return this.adminService.remove(name);
  }
}