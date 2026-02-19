import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ForwardEdmDocumentDto {
  @IsInt()
  toUserId: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  commentText?: string;
}

export class AssignDocumentResponsibleDto {
  @IsInt()
  responsibleUserId: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CreateDocumentReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  messageText: string;

  @IsOptional()
  @IsInt()
  parentReplyId?: number;

  @IsOptional()
  @IsInt()
  toUserId?: number;
}
