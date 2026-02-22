import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GisController } from './gis.controller';
import { GisService } from './gis.service';
import { GisLayer } from './entities/gis-layer.entity';
import { GisFeature } from './entities/gis-feature.entity';
import { Department } from '../department/entities/department.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GisLayer, GisFeature, Department, User])],
  controllers: [GisController],
  providers: [GisService],
  exports: [GisService],
})
export class GisModule {}
