import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { DisasterCategory } from './entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DisasterCategory])],
  providers: [CategoriesService],
  controllers: [CategoriesController],
  exports: [TypeOrmModule],
})
export class CategoriesModule {}
