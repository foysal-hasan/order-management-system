import { Controller, Get, Post, Body, Param, Query, Patch, UseGuards, Req, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { TransformResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import appConfig from 'src/config/app.config';
import { Storage } from 'src/common/lib/Disk/Storage';
import { ResponseMessage } from 'src/common/decorator/response-message.decorator';


@ApiTags('Application / Orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TransformResponseInterceptor)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Post()
  @ApiOperation({ summary: 'Place a new client checkout order' })
  async create(@Body() createOrderDto: CreateOrderDto, @Req() req: Request) {
    createOrderDto.customer_id = req.user.userId;
    const result = await this.ordersService.create(createOrderDto);
    result.order_items.forEach(item => {
      if (item.product.image) {
        const key = `${appConfig().storageUrl.product}${item.product.image}`;
        item.product.image = Storage.url(key);
      }
    });
    return result;
  }

  @Get('my-orders')
  @ApiOperation({ summary: "Retrieve authenticated customer's order history with query configurations" })
  async findMyOrders(@Req() req: Request, @Query() query: QueryOrderDto) {
    const result = await this.ordersService.findAllForClient(req.user.userId, query);
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
  @ApiOperation({ summary: 'Get single personal order breakdown detail' })
  async findOne(@Param('orderId') orderId: string, @Req() req: Request) {
    const result = await this.ordersService.findOne(orderId, req.user.userId);
    result.order_items.forEach(item => {
      if (item.product.image) {
        const key = `${appConfig().storageUrl.product}${item.product.image}`;
        item.product.image = Storage.url(key);
      }
    });
    return result;
  }

  @Patch(':orderId/cancel')
  @ApiOperation({ summary: 'Self-cancel an open order' })
  @ResponseMessage('Order cancellation request has been processed successfully.')
  cancel(@Param('orderId') orderId: string, @Req() req: Request) {
    return this.ordersService.cancel(orderId, req.user.userId);
  }
}