import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const allowedSources = ['auth', 'user', 'file'] as const;
type AuditSource = (typeof allowedSources)[number];

export class GetAuditLogsQueryDto {
  @ApiPropertyOptional({ enum: allowedSources, description: 'Filter by audit log source' })
  @IsOptional()
  @IsIn(allowedSources)
  source?: AuditSource;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 200 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;
}

export type AuditLogSource = AuditSource;
