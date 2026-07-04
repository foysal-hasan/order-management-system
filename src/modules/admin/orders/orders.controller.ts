import { Controller, Get, Body, Patch, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { QueryOrderDto } from './dto/query-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { TransformResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { UserType } from 'src/generated/prisma/enums';
import appConfig from 'src/config/app.config';
import { Storage } from 'src/common/lib/Disk/Storage';

@ApiTags('Admin / Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TransformResponseInterceptor)
@Roles(UserType.ADMIN)  
@Controller('admin/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  async findAll(@Query() query: QueryOrderDto) {
    const result = await this.ordersService.findAll(query);
    result.items.forEach(order => {
      order.order_items.forEach(item => {
        if (item.product.image) {
          const key = `${appConfig().storageUrl.product}${item.product.image}`;
          item.product.image = Storage.url(key);
        }
      });
    });
    return result;
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Get order details' })
  async findOne(@Param('orderId') orderId: string) {
    const result = await this.ordersService.findOne(orderId);
    result.order_items.forEach(item => {
      if (item.product.image) {
        const key = `${appConfig().storageUrl.product}${item.product.image}`;
        item.product.image = Storage.url(key);
      }
    });
    return result;
  }

  @Patch(':orderId/status')
  @ApiOperation({ summary: 'Update order status' })
  async updateStatus(@Param('orderId') orderId: string, @Body() updateOrderStatusDto: UpdateOrderStatusDto) {
    const result = await this.ordersService.updateStatus(orderId, updateOrderStatusDto);
    return result;
  }

  @Patch(':orderId/cancel')
  @ApiOperation({ summary: 'Cancel order by admin' })
  adminCancel(@Param('orderId') orderId: string) {
    return this.ordersService.cancel(orderId);
  }
}