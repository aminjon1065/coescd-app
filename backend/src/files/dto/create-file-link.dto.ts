import { IsIn, IsInt } from 'class-validator';
import { FileLinkResourceType } from '../entities/file-link.entity';

export class CreateFileLinkDto {
  @IsIn(['document', 'edm_document', 'task', 'message', 'report'])
  resourceType: FileLinkResourceType;

  @IsInt()
  resourceId: number;
}
