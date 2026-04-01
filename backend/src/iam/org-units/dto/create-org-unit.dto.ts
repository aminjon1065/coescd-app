import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { OrgUnitType } from '../../entities/org-unit.entity';

const ORG_UNIT_TYPES: OrgUnitType[] = ['committee', 'department', 'division'];

export class CreateOrgUnitDto {
  @ApiProperty({ example: 'Operations Department' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ORG_UNIT_TYPES })
  @IsIn(ORG_UNIT_TYPES)
  type: OrgUnitType;

  @ApiPropertyOptional({ type: Number, description: 'Parent org unit ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number;
}
