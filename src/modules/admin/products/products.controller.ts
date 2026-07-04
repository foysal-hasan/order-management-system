import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UseGuards, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';
import { QueryProductDto } from './dto/query-product.dto';
import { TransformResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { UserType } from 'src/generated/prisma/enums';
import { memoryStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express/multer/interceptors/file.interceptor';
import { extname } from 'path/win32';
import { StringHelper } from 'src/common/helper/string.helper';
import appConfig from 'src/config/app.config';
import { Storage } from 'src/common/lib/Disk/Storage';

@ApiTags('Admin / Products')
@ApiBearerAuth()
@Controller('admin/products')
@UseInterceptors(TransformResponseInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.ADMIN)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new catalog product using category name' })
  @ApiResponse({ status: 201, description: 'Product created successfully.' })
  @ApiResponse({ status: 409, description: 'Product already exists.' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image_file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed!'), false);
        }
      },
    }),
  )
  async create(@Body() createProductDto: CreateProductDto, @UploadedFile() file: Express.Multer.File) {
    try {
      if (!file) {
        throw new BadRequestException('Image file is required');
      }
      const generatedFilename = `${StringHelper.randomString(16)}${extname(file.originalname)}`;
      const key = `${appConfig().storageUrl.product}${generatedFilename}`;
      await Storage.put(key, file.buffer);
      createProductDto.image = generatedFilename;

      const result = await this.productsService.create(createProductDto);
      result.image = Storage.url(key);
      return result;
    } catch (error) {
      // clean up the uploaded file if an error occurs
      if (createProductDto.image) {
        const key = `${appConfig().storageUrl.product}${createProductDto.image}`;
        await Storage.delete(key);
      }
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'List products with queries (Admin)' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully.' })
  async findAll(@Query() query: QueryProductDto) {
    const result = await this.productsService.findAll(query);
    result.items.forEach(item => {
      if (item.image) {
        const key = `${appConfig().storageUrl.product}${item.image}`;
        item.image = Storage.url(key);
      }
    })

    return result;
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get product layout by slug (Admin)' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async findOne(@Param('slug') slug: string) {
    const result = await this.productsService.findBySlug(slug);
    if (result.image) {
      const key = `${appConfig().storageUrl.product}${result.image}`;
      result.image = Storage.url(key);
    }
    return result;
  }

  @Patch(':slug')
  @ApiOperation({ summary: 'Update a product structure by unique slug identifier' })
  @ApiResponse({ status: 200, description: 'Product updated successfully.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image_file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed!'), false);
        }
      },
    }),
  )
  async update(@Param('slug') slug: string, @Body() updateProductDto: UpdateProductDto, @UploadedFile() file: Express.Multer.File) {
    try {
      if (file) {
        const generatedFilename = `${StringHelper.randomString(16)}${extname(file.originalname)}`;
        const key = `${appConfig().storageUrl.product}${generatedFilename}`;
        await Storage.put(key, file.buffer);
        updateProductDto.image = generatedFilename;
      }

      const result = await this.productsService.update(slug, updateProductDto);
      if (result.updatedProduct.image) {
        const key = `${appConfig().storageUrl.product}${result.updatedProduct.image}`;
        result.updatedProduct.image = Storage.url(key);
      }

      // If the image was updated, delete the old image from storage
      if (result.oldImagePath) {
        const oldKey = `${appConfig().storageUrl.product}${result.oldImagePath}`;
        await Storage.delete(oldKey);
      }

      return result.updatedProduct;
    } catch (error) {
      // delete the uploaded file if any error occurs
      if (updateProductDto.image) {
        const key = `${appConfig().storageUrl.product}${updateProductDto.image}`;
        await Storage.delete(key);
      }
      throw error;
    }
  }

  @Delete(':slug')
  @ApiOperation({ summary: 'Delete a product from records by slug' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async remove(@Param('slug') slug: string) {
    const product = await this.productsService.remove(slug);
    if (product.image) {
      const key = `${appConfig().storageUrl.product}${product.image}`;
      await Storage.delete(key);
    }
    return null;
  }
}