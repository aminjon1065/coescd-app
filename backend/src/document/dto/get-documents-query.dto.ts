import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';

const documentTypes = ['incoming', 'outgoing', 'internal'] as const;
const documentStatuses = ['draft', 'sent', 'received', 'archived'] as const;

type DocumentType = (typeof documentTypes)[number];
type DocumentStatus = (typeof documentStatuses)[number];

export class GetDocumentsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(documentTypes)
  type?: DocumentType;

  @IsOptional()
  @IsIn(documentStatuses)
  status?: DocumentStatus;

  @IsOptional()
  @IsString()
  q?: string;
}
