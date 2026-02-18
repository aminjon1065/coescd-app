import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Disaster } from '../disasters/entities/disaster.entity';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../department/entities/department.entity';
import { Task } from '../../task/entities/task.entity';
import { EdmDocument } from '../../edm/entities/edm-document.entity';
import { EdmRouteStage } from '../../edm/entities/edm-route-stage.entity';
import { EdmAlert } from '../../edm/entities/edm-alert.entity';
import { EdmDocumentRoute } from '../../edm/entities/edm-document-route.entity';
import { FileEntity } from '../../files/entities/file.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Disaster,
      User,
      Department,
      Task,
      EdmDocument,
      EdmRouteStage,
      EdmAlert,
      EdmDocumentRoute,
      FileEntity,
    ]),
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
