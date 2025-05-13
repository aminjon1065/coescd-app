import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDisasterCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}
