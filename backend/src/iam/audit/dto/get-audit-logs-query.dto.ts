import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

const allowedSources = ['auth', 'user', 'file'] as const;
type AuditSource = (typeof allowedSources)[number];

export class GetAuditLogsQueryDto {
  @IsOptional()
  @IsIn(allowedSources)
  source?: AuditSource;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export type AuditLogSource = AuditSource;
