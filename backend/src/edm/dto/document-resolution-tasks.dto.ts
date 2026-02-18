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

export class ResolutionTaskItemDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  receiverId: number;
}

export class CreateResolutionTasksDto {
  @IsOptional()
  @IsString()
  resolutionText?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResolutionTaskItemDto)
  tasks: ResolutionTaskItemDto[];
}
