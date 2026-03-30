import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResolutionTaskItemDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  receiverId: number;
}

export class CreateResolutionTasksDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolutionText?: string;

  @ApiProperty({ isArray: true, type: () => ResolutionTaskItemDto })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResolutionTaskItemDto)
  tasks: ResolutionTaskItemDto[];
}
