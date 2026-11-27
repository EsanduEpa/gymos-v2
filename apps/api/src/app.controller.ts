import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from './database.service.js';

@Controller()
export class AppController {
  constructor(private readonly database: DatabaseService) {}

  @Get(['/', 'healthz'])
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
