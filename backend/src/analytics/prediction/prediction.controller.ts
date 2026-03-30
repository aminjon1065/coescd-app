import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PredictionService } from './prediction.service';
import { PredictDisastersDto } from './dto/predict-disasters.dto';
import { Permissions } from '../../iam/authorization/decorators/permissions.decorator';
import { Permission } from '../../iam/authorization/permission.type';

@ApiTags('Prediction')
@ApiBearerAuth()
@Controller('analytics/prediction')
export class PredictionController {
  constructor(private readonly predictionService: PredictionService) {}

  /**
   * Run a linear-regression forecast on historical disaster counts.
   *
   * Query params:
   *  - fromDate      ISO date — start of training window
   *  - toDate        ISO date — end of training window
   *  - horizonMonths number of future months to predict (1-24)
   *  - disasterTypeId (optional) filter by type
   *  - departmentId   (optional) filter by department
   */
  @Get()
  @Throttle({ heavy: { ttl: 60_000, limit: 10 } })
  @Permissions(Permission.ANALYTICS_READ)
  @ApiOperation({ summary: 'Run a linear-regression forecast on historical disaster counts' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  predict(@Query() dto: PredictDisastersDto) {
    return this.predictionService.predict(dto);
  }
}
