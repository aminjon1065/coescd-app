import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'global', description: 'Room identifier: "dept:{id}" or "global"' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^(dept:\d+|global)$/, {
    message: 'room must be "dept:{id}" or "global"',
  })
  room: string;

  @ApiProperty({ maxLength: 4000 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(4000)
  content: string;
}
