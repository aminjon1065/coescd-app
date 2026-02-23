import { IsInt, IsOptional, Min } from 'class-validator';

export class CreateFileShareDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  sharedWithUserId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  sharedWithDepartmentId?: number;
}
