import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const VALID_ROOM_RE = /^(dept:\d+|global|dm:\d+_\d+)$/;

export class WsChatHistoryDto {
  @ApiProperty({ description: 'Room identifier (dept:{id} | global | dm:{a}_{b})' })
  @IsString()
  @Matches(VALID_ROOM_RE, { message: 'Invalid room format' })
  room: string;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
