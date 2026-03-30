import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/http/pagination-query.dto';

const severities = ['low', 'medium', 'high', 'critical'] as const;
const statuses = ['active', 'resolved', 'monitoring'] as const;
type DisasterSeverity = (typeof severities)[number];
type DisasterStatus = (typeof statuses)[number];

export class GetDisastersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: severities })
  @IsOptional()
  @IsIn(severities)
  severity?: DisasterSeverity;

  @ApiPropertyOptional({ enum: statuses })
  @IsOptional()
  @IsIn(statuses)
  status?: DisasterStatus;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  departmentId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;
}
