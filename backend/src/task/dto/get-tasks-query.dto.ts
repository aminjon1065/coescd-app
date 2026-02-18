import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';

const taskStatuses = ['new', 'in_progress', 'completed'] as const;
type TaskStatus = (typeof taskStatuses)[number];

export class GetTasksQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(taskStatuses)
  status?: TaskStatus;

  @IsOptional()
  @IsString()
  q?: string;
}

