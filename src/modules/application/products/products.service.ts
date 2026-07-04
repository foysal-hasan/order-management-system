import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryProductDto } from './dto/query-product.dto';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) { }


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

    const [items, total] = await Promise.all([
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
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
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

}