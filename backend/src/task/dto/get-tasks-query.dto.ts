import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';

const taskStatuses = ['new', 'in_progress', 'completed'] as const;
type TaskStatus = (typeof taskStatuses)[number];

export class GetTasksQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['new', 'in_progress', 'completed'] })
  @IsOptional()
  @IsIn(taskStatuses)
  status?: TaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;
}
