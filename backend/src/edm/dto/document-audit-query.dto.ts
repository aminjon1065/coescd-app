import { Transform } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
} from 'class-validator';
import { EdmDocumentTimelineEventType } from '../entities/edm-document-timeline-event.entity';
import { EdmStageActionType } from '../entities/edm-stage-action.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';

const timelineEventTypes: EdmDocumentTimelineEventType[] = [
  'created',
  'edited',
  'forwarded',
  'responsible_assigned',
  'responsible_reassigned',
  'reply_sent',
  'route_action',
  'override',
  'archived',
];

const stageActionTypes: EdmStageActionType[] = [
  'approved',
  'rejected',
  'returned_for_revision',
  'commented',
  'override_approved',
  'override_rejected',
];

const toStringArray = ({ value }: { value: unknown }): string[] | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export class GetDocumentHistoryQueryDto {
  @ApiPropertyOptional({ isArray: true, type: [String] })
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsIn(timelineEventTypes, { each: true })
  eventTypes?: EdmDocumentTimelineEventType[];

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  actorUserId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  fromUserId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  toUserId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  responsibleUserId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  threadId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  toDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;
}

export class GetDocumentAuditQueryDto {
  @ApiPropertyOptional({ isArray: true, type: [String] })
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsIn(stageActionTypes, { each: true })
  actions?: EdmStageActionType[];

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  actorUserId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  onBehalfOfUserId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  stageId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reasonCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  toDate?: string;
}
