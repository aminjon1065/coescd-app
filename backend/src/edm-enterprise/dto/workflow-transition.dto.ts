import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class WorkflowTransitionDto {
  @IsString()
  action: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  delegateTo?: number;
}
