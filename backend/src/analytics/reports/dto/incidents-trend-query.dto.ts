import { IsDateString, IsOptional } from 'class-validator';

export class IncidentsTrendQueryDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
