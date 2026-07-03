import { Controller, Get, Header, HttpCode } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/')
  @Header('Content-Type', 'text/html')
  getHello(): string {
    return this.appService.getHello();
  }


  @Get('/health')
  @HttpCode(200)
  health() {
    return { status: 'healthy' };
  }
}
