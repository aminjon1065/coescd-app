import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '../enums/task.enums';

export class ChangeTaskStatusDto {
  @ApiProperty({ enum: TaskStatus })
  @IsEnum(TaskStatus)
  status: TaskStatus;

  @ApiPropertyOptional({ description: 'Required when blocking or rejecting' })
  @IsOptional()
  @IsString()
  reason?: string;
}
