import { Transform } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, Min } from 'class-validator';

export class EdmReportsQueryDto {
  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @IsOptional()
  @IsISO8601()
  toDate?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  departmentId?: number;
}

export class EdmDashboardQueryDto extends EdmReportsQueryDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  topManagers?: number;
}
