import { IsBoolean, IsObject, IsOptional } from 'class-validator';

export class SaveContentDto {
  @IsObject()
  content: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  autoSave?: boolean;
}
