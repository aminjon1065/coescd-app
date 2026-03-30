import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetAlertsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['due_soon', 'overdue', 'escalation'] })
  @IsOptional()
  @IsIn(['due_soon', 'overdue', 'escalation'])
  kind?: 'due_soon' | 'overdue' | 'escalation';

  @ApiPropertyOptional({ enum: ['unread', 'read'] })
  @IsOptional()
  @IsIn(['unread', 'read'])
  status?: 'unread' | 'read';
}
