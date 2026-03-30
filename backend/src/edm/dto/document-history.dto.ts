import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ForwardEdmDocumentDto {
  @ApiProperty()
  @IsInt()
  toUserId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  commentText?: string;
}

export class AssignDocumentResponsibleDto {
  @ApiProperty()
  @IsInt()
  responsibleUserId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CreateDocumentReplyDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  messageText: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  parentReplyId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  toUserId?: number;
}
