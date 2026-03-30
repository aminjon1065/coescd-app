import { IsIn, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FileLinkResourceType } from '../entities/file-link.entity';

export class CreateFileLinkDto {
  @ApiProperty({ enum: ['document', 'edm_document', 'task', 'message', 'report'] })
  @IsIn(['document', 'edm_document', 'task', 'message', 'report'])
  resourceType: FileLinkResourceType;

  @ApiProperty()
  @IsInt()
  resourceId: number;
}
