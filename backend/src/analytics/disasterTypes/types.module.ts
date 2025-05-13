import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypesService } from './types.service';
import { TypesController } from './types.controller';
import { DisasterType } from './entities/disaster-type.entity';
import { DisasterCategory } from '../disasterCategories/entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DisasterType, DisasterCategory])],
  providers: [TypesService],
  controllers: [TypesController],
  exports: [TypeOrmModule],
})
export class TypesModule {}
