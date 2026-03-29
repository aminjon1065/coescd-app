/**
 * EDM domain event classes and name constants.
 *
 * Events are emitted AFTER the persisting transaction commits so listeners
 * see a consistent database state.  All event classes are plain objects —
 * no NestJS decorators needed here.
 */

// ─── Event name constants ──────────────────────────────────────────────────

export const EdmEvents = {
  DOCUMENT_CREATED: 'edm.document.created',
  DOCUMENT_SUBMITTED: 'edm.document.submitted',
  STAGE_ACTION_EXECUTED: 'edm.stage.action.executed',
  DOCUMENT_OVERRIDDEN: 'edm.document.overridden',
  DOCUMENT_ARCHIVED: 'edm.document.archived',
  DOCUMENT_REGISTERED: 'edm.document.registered',
} as const;

export type EdmEventName = (typeof EdmEvents)[keyof typeof EdmEvents];

// ─── Event classes ─────────────────────────────────────────────────────────

export class EdmDocumentCreatedEvent {
  constructor(
    public readonly documentId: number,
    public readonly actorId: number,
    public readonly documentType: string,
    public readonly title: string,
    public readonly departmentId: number,
  ) {}
}

export class EdmDocumentSubmittedEvent {
  constructor(
    public readonly documentId: number,
    public readonly actorId: number,
    public readonly routeId: number,
    public readonly versionNo: number,
    public readonly externalNumber: string | null,
  ) {}
}

export class EdmStageActionExecutedEvent {
  constructor(
    public readonly documentId: number,
    public readonly routeId: number,
    public readonly stageId: number,
    public readonly action: string,
    public readonly actorId: number,
    public readonly documentStatus: string,
    public readonly routeState: string,
  ) {}
}

export class EdmDocumentOverriddenEvent {
  constructor(
    public readonly documentId: number,
    public readonly actorId: number,
    public readonly overrideAction: string,
    public readonly newStatus: string,
  ) {}
}

export class EdmDocumentArchivedEvent {
  constructor(
    public readonly documentId: number,
    public readonly actorId: number,
  ) {}
}

export class EdmDocumentRegisteredEvent {
  constructor(
    public readonly documentId: number,
    public readonly actorId: number,
    public readonly registrationNumber: string,
    public readonly journalType: string,
  ) {}
}
