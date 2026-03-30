import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const VALID_ROOM_RE = /^(dept:\d+|global|dm:\d+_\d+)$/;

export class WsChatJoinDto {
  @ApiProperty({ description: 'Room identifier (dept:{id} | global | dm:{a}_{b})' })
  @IsString()
  @Matches(VALID_ROOM_RE, { message: 'Invalid room format' })
  room: string;
}
