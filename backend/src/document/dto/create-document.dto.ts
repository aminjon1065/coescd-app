import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
} from 'class-validator';

export class CreateDocumentDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsEnum(['incoming', 'outgoing', 'internal'])
  type?: string;

  @IsOptional()
  @IsEnum(['draft', 'sent', 'received', 'archived'])
  status?: string;

  @IsOptional()
  @IsInt()
  receiverId?: number;

  @IsOptional()
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  filePath?: string;
}
