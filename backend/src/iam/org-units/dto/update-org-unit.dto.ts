import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { OrgUnitType } from '../../entities/org-unit.entity';

const ORG_UNIT_TYPES: OrgUnitType[] = ['committee', 'department', 'division'];

export class UpdateOrgUnitDto {
  @ApiPropertyOptional({ example: 'Updated Operations Department' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ORG_UNIT_TYPES })
  @IsOptional()
  @IsIn(ORG_UNIT_TYPES)
  type?: OrgUnitType;

  @ApiPropertyOptional({ type: Number, nullable: true, description: 'Parent org unit ID (null to unset)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number | null;
}
