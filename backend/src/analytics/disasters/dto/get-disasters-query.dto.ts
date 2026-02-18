import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/http/pagination-query.dto';

const severities = ['low', 'medium', 'high', 'critical'] as const;
const statuses = ['active', 'resolved', 'monitoring'] as const;
type DisasterSeverity = (typeof severities)[number];
type DisasterStatus = (typeof statuses)[number];

export class GetDisastersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(severities)
  severity?: DisasterSeverity;

  @IsOptional()
  @IsIn(statuses)
  status?: DisasterStatus;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  departmentId?: number;

  @IsOptional()
  @IsString()
  q?: string;
}

