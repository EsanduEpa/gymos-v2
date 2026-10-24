import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { return503OnClosing: true });
  app.enableShutdownHooks(['SIGTERM', 'SIGINT']);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
