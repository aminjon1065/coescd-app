import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';

export class GetEdmQueueQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string;
}
