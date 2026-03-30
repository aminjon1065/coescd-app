import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';
import { DepartmentEnum } from '../enums/department.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetDepartmentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: DepartmentEnum })
  @IsOptional()
  @IsIn(Object.values(DepartmentEnum))
  type?: DepartmentEnum;

  @ApiPropertyOptional({ description: 'Search query (name)' })
  @IsOptional()
  @IsString()
  q?: string;
}
