import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

const supportedModes = ['upsert'] as const;
export type BulkImportMode = (typeof supportedModes)[number];

export class BulkImportDryRunDto {
  @IsOptional()
  @IsIn(supportedModes)
  mode?: BulkImportMode;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  allowRoleUpdate?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  allowPermissionUpdate?: boolean;
}

