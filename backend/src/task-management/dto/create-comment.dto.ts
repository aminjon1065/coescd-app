import { IsArray, IsInt, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ description: 'Parent comment ID for threading' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ type: [Number], description: 'User IDs to mention' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  mentionUserIds?: number[];
}

export class UpdateCommentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  content: string;
}
