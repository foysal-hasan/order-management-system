import { Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductCategoryQueryDto } from './dto/query-product-category.dto';

@Injectable()
export class ProductCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProductCategoryQueryDto) {
    const { search } = query;

    const whereClause: Prisma.ProductCategoryWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    return this.prisma.productCategory.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(name: string) {
    const category = await this.prisma.productCategory.findUnique({
      where: { name },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Product category with name "${name}" not found`);
    }

    return category;
  }
}