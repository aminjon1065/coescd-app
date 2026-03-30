import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';
import { CallStatus } from '../entities/call.entity';

const CALL_STATUSES: CallStatus[] = [
  'pending',
  'active',
  'missed',
  'rejected',
  'ended',
];

export class CallQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['pending', 'active', 'missed', 'rejected', 'ended'] })
  @IsOptional()
  @IsIn(CALL_STATUSES)
  status?: CallStatus;
}
