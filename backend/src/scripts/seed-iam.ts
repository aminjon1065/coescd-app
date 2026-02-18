import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { IamSeedService } from '../iam/seeds/iam-seed.service';

async function bootstrap() {
  process.env.REDIS_DISABLED = process.env.REDIS_DISABLED ?? 'true';
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const seedService = app.get(IamSeedService);
    await seedService.seed();
  } finally {
    await app.close();
  }
}

void bootstrap();
