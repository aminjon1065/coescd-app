import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisastersService } from './disasters.service';
import { DisastersController } from './disasters.controller';
import { Disaster } from './entities/disaster.entity';
import { DisasterType } from '../disasterTypes/entities/disaster-type.entity';
import { Department } from '../../department/entities/department.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Disaster, DisasterType, Department])],
  providers: [DisastersService],
  controllers: [DisastersController],
  exports: [DisastersService, TypeOrmModule],
})
export class DisastersModule {}
