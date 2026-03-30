import { IsBoolean, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkImportApplyDto {
  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  sessionId: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  idempotencyKey: string;

  @ApiProperty()
  @IsBoolean()
  confirm: boolean;
}
