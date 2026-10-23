import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/tenant/client.js';

@Injectable()
export class TenantDatabaseService implements OnModuleDestroy {
  private readonly clients = new Map<string, PrismaClient>();

  forDatabase(databaseName: string): PrismaClient {
    let client = this.clients.get(databaseName);
    if (client) return client;

    const base = process.env.TENANT_DATABASE_URL;
    if (!base) throw new Error('TENANT_DATABASE_URL is missing');

    const url = new URL(base);
    url.pathname = `/${databaseName}`;

    client = new PrismaClient({
      adapter: new PrismaPg({ connectionString: url.toString() }),
    });

    this.clients.set(databaseName, client);
    return client;
  }

  async withDatabase<Result>(
    databaseName: string,
    work: (client: PrismaClient) => Promise<Result>,
  ): Promise<Result> {
    return work(this.forDatabase(databaseName));
  }

  async onModuleDestroy() {
    await Promise.all(
      [...this.clients.values()].map((client) => client.$disconnect()),
    );
  }
}
