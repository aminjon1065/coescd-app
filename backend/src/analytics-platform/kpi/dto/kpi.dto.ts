import { IsOptional, IsString } from 'class-validator';

export class KpiQueryDto {
  @IsOptional()
  @IsString()
  scope_type?: string;

  @IsOptional()
  @IsString()
  scope_value?: string;
}

export class KpiHistoryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  scope_type?: string;

  @IsOptional()
  @IsString()
  scope_value?: string;
}

export class KpiValueResponseDto {
  code: string;
  nameRu: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  vsPrevPct: number | null;
  thresholdStatus: 'normal' | 'warning' | 'critical';
  capturedAt: Date;
}
