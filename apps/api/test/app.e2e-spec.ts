import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppController } from '../src/app.controller.js';
import { DatabaseService } from '../src/database.service.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const query = vi.fn();

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: DatabaseService, useValue: { master: { $queryRaw: query } } }],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it.each(['/', '/healthz'])('serves liveness at %s', async (path) => {
    await request(app.getHttpServer())
      .get(path)
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('serves readiness when Master answers and returns 503 when it cannot', async () => {
    query.mockResolvedValueOnce([{ '?column?': 1 }]);
    await request(app.getHttpServer()).get('/readyz').expect(200).expect({ status: 'ok' });
    query.mockRejectedValueOnce(new Error('private connection details'));
    await request(app.getHttpServer()).get('/readyz').expect(503).expect({
      statusCode: 503,
      message: 'Not ready',
      error: 'Service Unavailable',
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
