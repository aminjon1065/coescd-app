import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  EdmDocumentArchivedEvent,
  EdmDocumentCreatedEvent,
  EdmDocumentOverriddenEvent,
  EdmDocumentRegisteredEvent,
  EdmDocumentSubmittedEvent,
  EdmEvents,
  EdmStageActionExecutedEvent,
} from './events/edm-events';

/**
 * Central listener for EDM domain events.
 *
 * Receives events emitted by EdmDocumentService, EdmRouteService, and
 * EdmRegistrationService after their transactions commit.  All side-effects
 * that do not need to be part of the originating transaction (notifications,
 * audit logging, metric increments, …) belong here rather than being called
 * inline in the emitting service.
 *
 * Each @OnEvent handler is isolated: a failure in one handler does not affect
 * the others or the original HTTP response (EventEmitter2 dispatches
 * synchronously by default; use `{ async: true }` on forRoot() when async
 * fire-and-forget is needed).
 */
@Injectable()
export class EdmEventListener {
  private readonly logger = new Logger(EdmEventListener.name);

  @OnEvent(EdmEvents.DOCUMENT_CREATED)
  handleDocumentCreated(event: EdmDocumentCreatedEvent) {
    this.logger.log(
      `[edm.document.created] doc=${event.documentId} type=${event.documentType} actor=${event.actorId}`,
    );
  }

  @OnEvent(EdmEvents.DOCUMENT_SUBMITTED)
  handleDocumentSubmitted(event: EdmDocumentSubmittedEvent) {
    this.logger.log(
      `[edm.document.submitted] doc=${event.documentId} route=${event.routeId} v${event.versionNo} extNo=${event.externalNumber ?? 'pending'} actor=${event.actorId}`,
    );
  }

  @OnEvent(EdmEvents.STAGE_ACTION_EXECUTED)
  handleStageActionExecuted(event: EdmStageActionExecutedEvent) {
    this.logger.log(
      `[edm.stage.action.executed] doc=${event.documentId} stage=${event.stageId} action=${event.action} docStatus=${event.documentStatus} routeState=${event.routeState} actor=${event.actorId}`,
    );
  }

  @OnEvent(EdmEvents.DOCUMENT_OVERRIDDEN)
  handleDocumentOverridden(event: EdmDocumentOverriddenEvent) {
    this.logger.log(
      `[edm.document.overridden] doc=${event.documentId} overrideAction=${event.overrideAction} newStatus=${event.newStatus} actor=${event.actorId}`,
    );
  }

  @OnEvent(EdmEvents.DOCUMENT_ARCHIVED)
  handleDocumentArchived(event: EdmDocumentArchivedEvent) {
    this.logger.log(
      `[edm.document.archived] doc=${event.documentId} actor=${event.actorId}`,
    );
  }

  @OnEvent(EdmEvents.DOCUMENT_REGISTERED)
  handleDocumentRegistered(event: EdmDocumentRegisteredEvent) {
    this.logger.log(
      `[edm.document.registered] doc=${event.documentId} regNo=${event.registrationNumber} journal=${event.journalType} actor=${event.actorId}`,
    );
  }
}
