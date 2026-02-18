import { IsBoolean, IsString, MinLength } from 'class-validator';

export class BulkImportApplyDto {
  @IsString()
  @MinLength(8)
  sessionId: string;

  @IsString()
  @MinLength(8)
  idempotencyKey: string;

  @IsBoolean()
  confirm: boolean;
}

