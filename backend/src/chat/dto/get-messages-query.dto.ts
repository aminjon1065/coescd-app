import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';
import { ApiProperty } from '@nestjs/swagger';

export class GetMessagesQueryDto extends PaginationQueryDto {
  @ApiProperty({ example: 'global', description: 'Room identifier: "dept:{id}" or "global"' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^(dept:\d+|global)$/, {
    message: 'room must be "dept:{id}" or "global"',
  })
  room: string;
}
