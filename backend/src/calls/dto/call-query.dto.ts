import { IsIn, IsOptional } from 'class-validator';
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
  @IsOptional()
  @IsIn(CALL_STATUSES)
  status?: CallStatus;
}
