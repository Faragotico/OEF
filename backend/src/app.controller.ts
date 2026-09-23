import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './infra/http/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Aberta: é o "o backend está de pé?" — serve para conferir o
  // servidor sem precisar de sessão.
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
