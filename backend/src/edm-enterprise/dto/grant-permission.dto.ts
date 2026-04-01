import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  Min,
} from 'class-validator';
import { PermissionLevel, PrincipalType } from '../entities/edm-document-permission.entity';

export class GrantPermissionDto {
  @IsEnum(['user', 'role', 'department'])
  principalType: PrincipalType;

  @IsInt()
  @Min(1)
  principalId: number;

  @IsEnum(['view', 'comment', 'edit', 'approve', 'share', 'delete'])
  permission: PermissionLevel;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @IsOptional()
  @IsObject()
  conditions?: Record<string, unknown>;
}
