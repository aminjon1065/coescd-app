import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const registrationStatuses = ['registered', 'cancelled'] as const;
const journalTypes = ['incoming', 'outgoing'] as const;

export class UpdateRegistrationStatusDto {
  @ApiProperty({ enum: ['registered', 'cancelled'] })
  @IsIn(registrationStatuses)
  status: (typeof registrationStatuses)[number];
}

export class GetRegistrationJournalQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['incoming', 'outgoing'] })
  @IsOptional()
  @IsIn(journalTypes)
  journalType?: (typeof journalTypes)[number];

  @ApiPropertyOptional({ enum: ['registered', 'cancelled'] })
  @IsOptional()
  @IsIn(registrationStatuses)
  status?: (typeof registrationStatuses)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  departmentId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  toDate?: string;
}
