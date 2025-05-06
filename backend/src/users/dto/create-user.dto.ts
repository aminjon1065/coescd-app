import { IsDate, IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @MinLength(6, {
    message: 'Password is too short. Minimum length is 6 characters.',
  })
  password: string;

  @IsString()
  name: string;

  @IsDate()
  createdAt?: Date;
}
