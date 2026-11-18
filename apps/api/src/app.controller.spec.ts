import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseService } from './database.service.js';

describe('AppController', () => {
  let appController: AppController;
  const query = vi.fn();

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: DatabaseService, useValue: { master: { $queryRaw: query } } }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  it('reports readiness independently of process liveness and keeps dependency details private', async () => {
    query.mockResolvedValueOnce([{ '?column?': 1 }]);
    await expect(appController.readiness()).resolves.toEqual({ status: 'ok' });
    query.mockRejectedValueOnce(new Error('private connection details'));
    await expect(appController.readiness()).rejects.toMatchObject({ status: 503, message: 'Not ready' });
    expect(appController.liveness()).toEqual({ status: 'ok' });
  });
});
