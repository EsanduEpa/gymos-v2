import { NestFactory } from '@nestjs/core';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { return503OnClosing: true });
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    next();
  });
  app.enableShutdownHooks(['SIGTERM', 'SIGINT']);
  const port = process.env.PORT ?? 3000;
  const host = process.env.GYMOS_API_HOST;
  if (host) await app.listen(port, host);
  else await app.listen(port);
}
await bootstrap();
