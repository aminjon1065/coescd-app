import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';

const registrationStatuses = ['registered', 'cancelled'] as const;
const journalTypes = ['incoming', 'outgoing'] as const;

export class UpdateRegistrationStatusDto {
  @IsIn(registrationStatuses)
  status: (typeof registrationStatuses)[number];
}

export class GetRegistrationJournalQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(journalTypes)
  journalType?: (typeof journalTypes)[number];

  @IsOptional()
  @IsIn(registrationStatuses)
  status?: (typeof registrationStatuses)[number];

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @IsOptional()
  @IsISO8601()
  toDate?: string;
}
