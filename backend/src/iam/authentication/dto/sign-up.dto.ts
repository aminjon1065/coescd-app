import { IsEmail, IsString, MinLength } from 'class-validator';

export class SignUpDto {
  @IsEmail()
  email: string;
  @MinLength(6)
  password: string;
  @IsString()
  name: string;
}
