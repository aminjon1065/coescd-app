import { IsBoolean, IsInt, IsOptional, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WsCallInviteDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  receiverId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasVideo?: boolean;
}
