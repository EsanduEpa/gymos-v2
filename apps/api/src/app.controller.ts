import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service.js';
import { DatabaseService } from './database.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private readonly database: DatabaseService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('healthz')
  liveness() {
    return { status: 'ok' };
  }

  @Get('readyz')
  async readiness() {
    try {
      await this.database.master.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Not ready');
    }
    return { status: 'ok' };
  }
}
