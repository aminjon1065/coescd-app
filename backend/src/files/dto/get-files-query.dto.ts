import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';

export class GetFilesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ['active', 'deleted'] })
  @IsOptional()
  @IsIn(['active', 'deleted'])
  status?: 'active' | 'deleted';
}
