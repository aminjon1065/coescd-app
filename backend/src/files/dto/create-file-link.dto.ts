import { IsEnum, IsInt } from 'class-validator';
import { FileLinkResourceType } from '../entities/file-link.entity';

export class CreateFileLinkDto {
  @IsEnum(['document', 'task', 'message', 'report'])
  resourceType: FileLinkResourceType;

  @IsInt()
  resourceId: number;
}
