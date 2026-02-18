import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';

export class GetAlertsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['due_soon', 'overdue', 'escalation'])
  kind?: 'due_soon' | 'overdue' | 'escalation';

  @IsOptional()
  @IsIn(['unread', 'read'])
  status?: 'unread' | 'read';
}
