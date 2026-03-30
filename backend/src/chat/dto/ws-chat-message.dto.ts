import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const VALID_ROOM_RE = /^(dept:\d+|global|dm:\d+_\d+)$/;

export class WsChatMessageDto {
  @ApiProperty({ description: 'Room identifier (dept:{id} | global | dm:{a}_{b})' })
  @IsString()
  @Matches(VALID_ROOM_RE, { message: 'Invalid room format' })
  room: string;

  @ApiProperty({ minLength: 1, maxLength: 4000 })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;
}
