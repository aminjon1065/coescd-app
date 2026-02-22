import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';

export class GetMessagesQueryDto extends PaginationQueryDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^(dept:\d+|global)$/, {
    message: 'room must be "dept:{id}" or "global"',
  })
  room: string;
}
