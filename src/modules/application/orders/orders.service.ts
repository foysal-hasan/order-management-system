import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryOrderDto } from './dto/query-order.dto';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) { }

  private async generateMultiProductOrderId(firstProdName: string, firstCatName: string): Promise<string> {
    const catPrefix = firstCatName.substring(0, 3).toUpperCase().padEnd(3, 'X');
    const prodPrefix = firstProdName.substring(0, 3).toUpperCase().padEnd(3, 'X');
    const date = new Date();
    const dateString = date.getFullYear().toString().slice(-2) +
      String(date.getMonth() + 1).padStart(2, '0') +
      String(date.getDate()).padStart(2, '0');

    let orderId = '';
    let isUnique = false;
    while (!isUnique) {
      const randomHex = randomBytes(2).toString('hex').toUpperCase();
      orderId = `${catPrefix}-${prodPrefix}-${dateString}-${randomHex}`;
      const existing = await this.prisma.order.findUnique({ where: { order_id: orderId } });
      if (!existing) isUnique = true;
    }
    return orderId;
  }


  private parseSortParam(sortString: string): Prisma.OrderOrderByWithRelationInput {
    if (!sortString) return { created_at: 'desc' };

    const [field, direction] = sortString.split('_');

    // Enforce Prisma's expected SortOrder type ('asc' or 'desc')
    const sortOrder: Prisma.SortOrder = direction === 'asc' ? 'asc' : 'desc';

    // Map the DTO field names to your database snake_case columns
    const actualField = field === 'createdAt' ? 'created_at' : field === 'totalPrice' ? 'total_price' : field;

    return { [actualField]: sortOrder };
  }

  async create(createOrderDto: CreateOrderDto) {
    const { customer_id, payment_method, items } = createOrderDto;
    if (!items || items.length === 0) throw new BadRequestException('Order must contain items.');

    const productIds = items.map(i => i.product_id);
    const dbProducts = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { category: true },
    });

    if (dbProducts.length !== items.length) throw new NotFoundException('Some products were not found.');
    const productMap = new Map(dbProducts.map(p => [p.id, p]));
    let aggregateTotalPrice = 0;

    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (product.stock_quantity < item.quantity) {
        throw new BadRequestException(`Insufficient stock for "${product.name}".`);
      }
      aggregateTotalPrice += Number(product.price) * item.quantity;
    }

    const orderIdStr = await this.generateMultiProductOrderId(dbProducts[0].name, dbProducts[0].category.name);

    return this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: { order_id: orderIdStr, customer_id, total_price: aggregateTotalPrice, payment_method },
      });

      const orderItemsData = [];
      for (const item of items) {
        const product = productMap.get(item.product_id);
        await tx.product.update({
          where: { id: item.product_id },
          data: { stock_quantity: { decrement: item.quantity } },
        });
        orderItemsData.push({
          order_id: newOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: product.price,
        });
      }
      await tx.orderItem.createMany({ data: orderItemsData });
      return tx.order.findUnique({
        where: { id: newOrder.id },
        include: { order_items: { include: { product: true } } },
      });
    });
  }

  async findAllForClient(customerId: string, query: QueryOrderDto) {
    const { page, limit, status, sort } = query;
    const skip = (page - 1) * limit;
    const where: any = { customer_id: customerId };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: { order_items: { include: { product: true } } },
        orderBy: this.parseSortParam(sort),
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }



  async findOne(orderId: string, customerId?: string) {
    const where: any = { OR: [{ id: orderId }, { order_id: orderId }] };
    if (customerId) where.customer_id = customerId;

    const order = await this.prisma.order.findFirst({
      where,
      include: { order_items: { include: { product: true } } },
    });
    if (!order) throw new NotFoundException('Order not found.');
    return order;
  }



  async cancel(orderId: string, customerId: string) {
    const order = await this.findOne(orderId, customerId);
    if (order.status === OrderStatus.CANCELLED) throw new BadRequestException('Order already cancelled.');

    // if not pending or processing, then throw error
    const cancellableStatuses: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.PROCESSING];
    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException(`Order cannot be cancelled in it's current status: ${order.status}.`);
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of order.order_items) {
        await tx.product.update({
          where: { id: item.product_id },
          data: { stock_quantity: { increment: item.quantity } },
        });
      }
      return tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
      });
    });
  }
}