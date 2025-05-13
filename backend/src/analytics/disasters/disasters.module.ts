import { Module } from '@nestjs/common';
import { DisastersService } from './disasters.service';
import { DisastersController } from './disasters.controller';

@Module({
  providers: [DisastersService],
  controllers: [DisastersController]
})
export class DisastersModule {}
