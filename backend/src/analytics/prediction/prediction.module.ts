import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PredictionService } from './prediction.service';
import { PredictionController } from './prediction.controller';
import { Disaster } from '../disasters/entities/disaster.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Disaster])],
  providers: [PredictionService],
  controllers: [PredictionController],
})
export class PredictionModule {}
