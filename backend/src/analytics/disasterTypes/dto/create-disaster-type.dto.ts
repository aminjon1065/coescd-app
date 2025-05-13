import { IsNotEmpty, IsString, IsInt } from 'class-validator';

export class CreateDisasterTypeDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsInt()
  categoryId: number;
}
