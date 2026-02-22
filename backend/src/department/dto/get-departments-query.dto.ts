import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';
import { DepartmentEnum } from '../enums/department.enum';

export class GetDepartmentsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(Object.values(DepartmentEnum))
  type?: DepartmentEnum;

  @IsOptional()
  @IsString()
  q?: string;
}
