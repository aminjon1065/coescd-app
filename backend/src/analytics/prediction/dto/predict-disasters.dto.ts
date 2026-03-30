import {
  IsInt,
  IsOptional,
  IsPositive,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PredictDisastersDto {
  /** ISO date string — start of historical window (inclusive) */
  @ApiProperty()
  @IsDateString()
  fromDate: string;

  /** ISO date string — end of historical window (inclusive) */
  @ApiProperty()
  @IsDateString()
  toDate: string;

  /** Number of future months to predict (1–24) */
  @ApiProperty({ type: Number })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  horizonMonths: number;

  /** Filter history by disaster type id */
  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  disasterTypeId?: number;

  /** Filter history by department id */
  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  departmentId?: number;
}
