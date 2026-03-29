import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RedisIoAdapter } from './redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── WebSocket adapter ──────────────────────────────────────────────────────
  // RedisIoAdapter extends the default IoAdapter and applies @socket.io/redis-adapter
  // so that room broadcasts reach clients on ALL horizontal instances.
  // Falls back to the default in-process adapter when REDIS_DISABLED=true.
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // Close the two pub/sub Redis connections cleanly on process exit
  app.enableShutdownHooks();
  process.on('beforeExit', () => void redisIoAdapter.onShutdown());

  app.useGlobalPipes(new ValidationPipe());
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    preflightContinue: false,
  });
  const config = new DocumentBuilder()
    .setTitle('COESCD API')
    .setDescription('Emergency Management Platform (КЧС) REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
  await app.listen(process.env.PORT ?? 8008);
}

void bootstrap();
