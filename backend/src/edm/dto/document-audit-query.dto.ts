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

const timelineEventTypes: EdmDocumentTimelineEventType[] = [
  'created',
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
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export class GetDocumentHistoryQueryDto {
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsIn(timelineEventTypes, { each: true })
  eventTypes?: EdmDocumentTimelineEventType[];

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  actorUserId?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  fromUserId?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  toUserId?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  responsibleUserId?: number;

  @IsOptional()
  @IsString()
  threadId?: string;

  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @IsOptional()
  @IsISO8601()
  toDate?: string;

  @IsOptional()
  @IsString()
  q?: string;
}

export class GetDocumentAuditQueryDto {
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsIn(stageActionTypes, { each: true })
  actions?: EdmStageActionType[];

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  actorUserId?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  onBehalfOfUserId?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  stageId?: number;

  @IsOptional()
  @IsString()
  reasonCode?: string;

  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @IsOptional()
  @IsISO8601()
  toDate?: string;
}
