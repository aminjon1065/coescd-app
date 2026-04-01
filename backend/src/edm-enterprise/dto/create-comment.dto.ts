import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MaxLength(10000)
  body: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsObject()
  anchor?: { from: number; to: number; text: string };

  @IsOptional()
  @IsBoolean()
  isSuggestion?: boolean;
}
