import { IsInt, IsObject, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WsCallSdpDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  callId: number;

  /** RTCSessionDescriptionInit — validated as a non-null object. */
  @ApiProperty()
  @IsObject()
  sdp: Record<string, unknown>;
}
