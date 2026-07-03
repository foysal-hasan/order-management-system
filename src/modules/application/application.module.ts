import { Module } from '@nestjs/common';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { ProductCategoriesModule } from './product-categories/product-categories.module';

@Module({
  imports: [ProductsModule, OrdersModule, ProductCategoriesModule]
})
export class ApplicationModule {}
