import { Module } from '@nestjs/common';
import { CategoriesModule } from './disasterCategories/categories.module';
import { TypesModule } from './disasterTypes/types.module';
import { DisastersModule } from './disasters/disasters.module';
import { ReportsModule } from './reports/reports.module';
import { PredictionModule } from './prediction/prediction.module';

@Module({
  imports: [
    CategoriesModule,
    TypesModule,
    DisastersModule,
    ReportsModule,
    PredictionModule,
  ],
  exports: [
    CategoriesModule,
    TypesModule,
    DisastersModule,
    ReportsModule,
    PredictionModule,
  ],
})
export class AnalyticsModule {}
