import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDisasterDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  location: string;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'critical'] })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity?: string;

  @ApiPropertyOptional({ enum: ['active', 'resolved', 'monitoring'] })
  @IsOptional()
  @IsEnum(['active', 'resolved', 'monitoring'])
  status?: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsInt()
  typeId?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsInt()
  departmentId?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsInt()
  casualties?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsInt()
  affectedPeople?: number;
}
