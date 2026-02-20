import axios from '@/lib/axios';
import type {
  IEdmAuditEvent,
  IEdmAuditQuery,
  IEdmDocument,
  IEdmDocumentKind,
  IEdmDocumentKindCreateDto,
  IEdmDocumentKindsQuery,
  IEdmDocumentKindUpdateDto,
  IEdmRegistrationJournalQuery,
  IEdmRegistrationJournalRecord,
  IEdmHistoryEvent,
  IEdmHistoryQuery,
  IEdmQueueQuery,
} from '@/interfaces/IEdmDocument';
import type { ListResponse } from '@/lib/list-response';

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue | QueryValue[]>;

const buildQueryParams = (query?: QueryParams): URLSearchParams => {
  const params = new URLSearchParams();
  if (!query) {
    return params;
  }

  for (const [key, rawValue] of Object.entries(query)) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      continue;
    }

    if (Array.isArray(rawValue)) {
      if (!rawValue.length) {
        continue;
      }
      const serialized = rawValue
        .filter((item) => item !== undefined && item !== null && item !== '')
        .map((item) => String(item))
        .join(',');
      if (serialized) {
        params.set(key, serialized);
      }
      continue;
    }

    params.set(key, String(rawValue));
  }

  return params;
};

const getBlob = async (url: string, query?: QueryParams): Promise<Blob> => {
  const response = await axios.get(url, {
    params: buildQueryParams(query),
    responseType: 'blob',
  });
  return response.data as Blob;
};

export const edmApi = {
  listDocumentKinds: async (
    query?: IEdmDocumentKindsQuery,
  ): Promise<IEdmDocumentKind[]> => {
    const response = await axios.get('/edm/document-kinds', {
      params: buildQueryParams(query as QueryParams | undefined),
    });
    return response.data as IEdmDocumentKind[];
  },

  createDocumentKind: async (
    payload: IEdmDocumentKindCreateDto,
  ): Promise<IEdmDocumentKind> => {
    const response = await axios.post('/edm/document-kinds', payload);
    return response.data as IEdmDocumentKind;
  },

  updateDocumentKind: async (
    documentKindId: number,
    payload: IEdmDocumentKindUpdateDto,
  ): Promise<IEdmDocumentKind> => {
    const response = await axios.patch(
      `/edm/document-kinds/${documentKindId}`,
      payload,
    );
    return response.data as IEdmDocumentKind;
  },

  deleteDocumentKind: async (
    documentKindId: number,
  ): Promise<{ deleted: boolean }> => {
    const response = await axios.delete(`/edm/document-kinds/${documentKindId}`);
    return response.data as { deleted: boolean };
  },

  listRegistrationJournal: async (
    query?: IEdmRegistrationJournalQuery,
  ): Promise<ListResponse<IEdmRegistrationJournalRecord>> => {
    const response = await axios.get('/edm/registration-journal', {
      params: buildQueryParams(query as QueryParams | undefined),
    });
    return response.data as ListResponse<IEdmRegistrationJournalRecord>;
  },

  listInbox: async (query?: IEdmQueueQuery): Promise<ListResponse<IEdmDocument>> => {
    const response = await axios.get('/edm/queues/inbox', {
      params: buildQueryParams(query as QueryParams | undefined),
    });
    return response.data as ListResponse<IEdmDocument>;
  },

  listOutbox: async (query?: IEdmQueueQuery): Promise<ListResponse<IEdmDocument>> => {
    const response = await axios.get('/edm/queues/outbox', {
      params: buildQueryParams(query as QueryParams | undefined),
    });
    return response.data as ListResponse<IEdmDocument>;
  },

  listIncomingMailbox: async (
    query?: IEdmQueueQuery,
  ): Promise<ListResponse<IEdmDocument>> => {
    const response = await axios.get('/edm/mailboxes/incoming', {
      params: buildQueryParams(query as QueryParams | undefined),
    });
    return response.data as ListResponse<IEdmDocument>;
  },

  listOutgoingMailbox: async (
    query?: IEdmQueueQuery,
  ): Promise<ListResponse<IEdmDocument>> => {
    const response = await axios.get('/edm/mailboxes/outgoing', {
      params: buildQueryParams(query as QueryParams | undefined),
    });
    return response.data as ListResponse<IEdmDocument>;
  },

  listHistory: async (
    documentId: number,
    query?: IEdmHistoryQuery,
  ): Promise<IEdmHistoryEvent[]> => {
    const response = await axios.get(`/edm/documents/${documentId}/history`, {
      params: buildQueryParams(query as QueryParams | undefined),
    });
    return response.data as IEdmHistoryEvent[];
  },

  listAudit: async (
    documentId: number,
    query?: IEdmAuditQuery,
  ): Promise<IEdmAuditEvent[]> => {
    const response = await axios.get(`/edm/documents/${documentId}/audit`, {
      params: buildQueryParams(query as QueryParams | undefined),
    });
    return response.data as IEdmAuditEvent[];
  },

  exportHistoryCsv: async (
    documentId: number,
    query?: IEdmHistoryQuery,
  ): Promise<Blob> => {
    return getBlob(`/edm/documents/${documentId}/history/export`, query as QueryParams | undefined);
  },

  exportHistoryXlsx: async (
    documentId: number,
    query?: IEdmHistoryQuery,
  ): Promise<Blob> => {
    return getBlob(
      `/edm/documents/${documentId}/history/export/xlsx`,
      query as QueryParams | undefined,
    );
  },

  exportAuditCsv: async (
    documentId: number,
    query?: IEdmAuditQuery,
  ): Promise<Blob> => {
    return getBlob(`/edm/documents/${documentId}/audit/export`, query as QueryParams | undefined);
  },

  exportAuditXlsx: async (
    documentId: number,
    query?: IEdmAuditQuery,
  ): Promise<Blob> => {
    return getBlob(
      `/edm/documents/${documentId}/audit/export/xlsx`,
      query as QueryParams | undefined,
    );
  },
};

export type EdmApiClient = typeof edmApi;
