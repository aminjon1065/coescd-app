import { IsInt, IsNotEmpty, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CreatePresignedUploadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  mimeType: string;

  @IsInt()
  @Min(1)
  sizeBytes: number;
}

export class CompletePresignedUploadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  key: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  mimeType: string;

  @IsInt()
  @Min(1)
  sizeBytes: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-f0-9]{64}$/)
  checksumSha256: string;
}
