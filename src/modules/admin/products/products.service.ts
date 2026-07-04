import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

import { randomBytes } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SlugHelper } from 'src/common/helper/slug.helper';
import { QueryProductDto } from './dto/query-product.dto';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = SlugHelper.slugify(name);
    let uniqueSlug = baseSlug;
    let isUnique = false;

    while (!isUnique) {
      const existing = await this.prisma.product.findUnique({
        where: { slug: uniqueSlug },
      });
      if (!existing) {
        isUnique = true;
      } else {
        const randomHash = randomBytes(3).toString('hex');
        uniqueSlug = `${baseSlug}-${randomHash}`;
      }
    }
    return uniqueSlug;
  }

  async create(createProductDto: CreateProductDto) {
    const slug = await this.generateUniqueSlug(createProductDto.name);

    const category = await this.prisma.productCategory.findUnique({
      where: { name: createProductDto.category_name },
    });

    if (!category) {
      throw new NotFoundException(`Category "${createProductDto.category_name}" does not exist.`);
    }

    return this.prisma.product.create({
      data: {
        name: createProductDto.name,
        image: createProductDto.image,
        price: createProductDto.price,
        stock_quantity: createProductDto.stock_quantity,
        slug,
        category_id: category.id,
      },
      include: { category: true },
    });
  }

  async findAll(query: QueryProductDto) {
    const { page, limit, search, category_name } = query;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.ProductWhereInput = {};

    if (search) {
      whereClause.name = { contains: search, mode: 'insensitive' };
    }

    if (category_name) {
      whereClause.category = {
        name: { equals: category_name, mode: 'insensitive' },
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { category: true },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.product.count({ where: whereClause }),
    ]);

    return {
      data,
      meta: { 
        total, 
        page, 
        limit, 
        totalPages: Math.ceil(total / limit) },
    };
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { category: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }

    return product;
  }

  async update(slug: string, updateProductDto: UpdateProductDto) {
    const product = await this.findBySlug(slug);
    let updatedSlug = product.slug;

    if (updateProductDto.name && updateProductDto.name !== product.name) {
      updatedSlug = await this.generateUniqueSlug(updateProductDto.name);
    }

    let categoryId = product.category_id;
    if (updateProductDto.category_name) {
      const category = await this.prisma.productCategory.findUnique({
        where: { name: updateProductDto.category_name },
      });
      if (!category) {
        throw new NotFoundException(`Category "${updateProductDto.category_name}" does not exist.`);
      }
      categoryId = category.id;
    }

    return this.prisma.product.update({
      where: { slug },
      data: {
        name: updateProductDto.name,
        image: updateProductDto.image,
        price: updateProductDto.price,
        stock_quantity: updateProductDto.stock_quantity,
        slug: updatedSlug,
        category_id: categoryId,
      },
      include: { category: true },
    });
  }

  async remove(slug: string) {
    return this.prisma.product.delete({
      where: { slug },
    });
  }
}