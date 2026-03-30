import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const supportedModes = ['upsert'] as const;
export type BulkImportMode = (typeof supportedModes)[number];

export class BulkImportDryRunDto {
  @ApiPropertyOptional({ enum: supportedModes })
  @IsOptional()
  @IsIn(supportedModes)
  mode?: BulkImportMode;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  allowRoleUpdate?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  allowPermissionUpdate?: boolean;
}
