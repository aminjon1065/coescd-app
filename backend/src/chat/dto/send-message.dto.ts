import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^(dept:\d+|global)$/, {
    message: 'room must be "dept:{id}" or "global"',
  })
  room: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(4000)
  content: string;
}
