import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WsCallActionDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  callId: number;
}
