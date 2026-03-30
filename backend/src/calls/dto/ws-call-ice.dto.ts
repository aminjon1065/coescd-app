import { IsInt, IsObject, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WsCallIceDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  callId: number;

  /** RTCIceCandidateInit — validated as a non-null object. */
  @ApiProperty()
  @IsObject()
  candidate: Record<string, unknown>;
}
