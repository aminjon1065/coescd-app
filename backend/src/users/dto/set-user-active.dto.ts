import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetUserActiveDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}
