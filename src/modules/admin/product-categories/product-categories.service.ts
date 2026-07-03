import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { ProductCategoryQueryDto } from './dto/query-product-category.dto';
import { Prisma } from 'src/generated/prisma/client';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';


@Injectable()
export class ProductCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCategoryDto: CreateProductCategoryDto) {
    return await this.prisma.productCategory.create({
        data: createCategoryDto,
      });
  }

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
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(name: string) {
    const category = await this.prisma.productCategory.findUnique({
      where: { name },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new NotFoundException(`Product category with name "${name}" not found`);
    }

    return category;
  }

  async update(name: string, updateCategoryDto: UpdateProductCategoryDto) {
      return await this.prisma.productCategory.update({
        where: { name },
        data: updateCategoryDto,
      });
  }

  async remove(name: string) {
    const category = await this.prisma.productCategory.findUnique({
      where: { name },
      include: { _count: { select: { products: true } } },
    });

    if (!category) {
      throw new NotFoundException(`Product category with name "${name}" not found`);
    }

   
    if (category._count.products > 0) {
      throw new ConflictException(`Cannot delete category because it contains active products.`);
    }

    return this.prisma.productCategory.delete({
      where: { name },
    });
  }
}