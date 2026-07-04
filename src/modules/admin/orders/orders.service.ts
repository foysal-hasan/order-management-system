import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryOrderDto } from './dto/query-order.dto';
import { OrderStatus } from 'src/generated/prisma/enums';
import { UpdateOrderStatusDto } from './dto/update-order-status';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) { }

  private parseSortParam(sortString: string): Prisma.OrderOrderByWithRelationInput {
    if (!sortString) return { created_at: 'desc' };

    // Split safely by the double underscore double delimiter
    const [field, direction] = sortString.split('__');

    // Cast directly to Prisma's strict SortOrder type
    const sortOrder: Prisma.SortOrder = direction === 'asc' ? 'asc' : 'desc';

    // Dynamic configuration object injection
    return { [field]: sortOrder };
  }

  async findAll(query: QueryOrderDto) {
    const { page, limit, status, payment_method, customer_id, start_date, end_date, sort } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (payment_method) where.payment_method = payment_method;
    if (customer_id) where.customer_id = customer_id;
    if (start_date || end_date) {
      where.created_at = {};

      if (start_date) {
        const start = new Date(start_date);
        start.setHours(0, 0, 0, 0);
        where.created_at.gte = start; // Now a proper Date object
      }

      if (end_date) {
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);
        where.created_at.lte = end; // Now a proper Date object
      }
    }

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

  async findOne(orderId: string) {
    const where: any = { OR: [{ id: orderId }, { order_id: orderId }] };

    const order = await this.prisma.order.findFirst({
      where,
      include: { order_items: { include: { product: true } } },
    });
    if (!order) throw new NotFoundException('Order not found.');
    return order;
  }

  async updateStatus(orderId: string, updateOrderStatusDto: UpdateOrderStatusDto) {
    const order = await this.findOne(orderId);
    return this.prisma.order.update({
      where: { id: order.id },
      data: { status: updateOrderStatusDto.status },
    });
  }

  async cancel(orderId: string, customerId?: string) {
    const order = await this.findOne(orderId);
    if (order.status === OrderStatus.CANCELLED) throw new BadRequestException('Order already cancelled.');

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
