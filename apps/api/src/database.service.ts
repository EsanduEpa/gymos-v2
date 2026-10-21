import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/master/client.js';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly master: PrismaClient;

  constructor() {
    const url = process.env.MASTER_DATABASE_URL;
    if (!url) throw new Error('MASTER_DATABASE_URL is missing');

    this.master = new PrismaClient({
      adapter: new PrismaPg({ connectionString: url }),
    });
  }

  async onModuleDestroy() {
    await this.master.$disconnect();
  }
}
