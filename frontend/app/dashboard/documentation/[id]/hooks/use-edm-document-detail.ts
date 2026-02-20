import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/auth-context';
import {
  IEdmAuditEvent,
  IEdmDocument,
  IEdmDocumentKind,
  IEdmFileAttachment,
  IEdmHistoryEvent,
  IEdmReply,
} from '@/interfaces/IEdmDocument';

export function useEdmDocumentDetail(rawId: string | string[] | undefined) {
  const { accessToken } = useAuth();
  const [document, setDocument] = useState<IEdmDocument | null>(null);
  const [auditEvents, setAuditEvents] = useState<IEdmAuditEvent[]>([]);
  const [historyEvents, setHistoryEvents] = useState<IEdmHistoryEvent[]>([]);
  const [replies, setReplies] = useState<IEdmReply[]>([]);
  const [attachments, setAttachments] = useState<IEdmFileAttachment[]>([]);
  const [availableFiles, setAvailableFiles] = useState<IEdmFileAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [submittingToRoute, setSubmittingToRoute] = useState(false);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [linkingFile, setLinkingFile] = useState(false);
  const [unlinkingFileId, setUnlinkingFileId] = useState<number | null>(null);
  const [stageActionLoadingId, setStageActionLoadingId] = useState<number | null>(null);
  const [stageCommentById, setStageCommentById] = useState<Record<number, string>>({});
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [documentKinds, setDocumentKinds] = useState<IEdmDocumentKind[]>([]);
  const [savingDocumentKind, setSavingDocumentKind] = useState(false);

  const documentId = useMemo(() => {
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    return Number(id);
  }, [rawId]);

  const fetchDocument = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<IEdmDocument>(`/edm/documents/${documentId}`);
      setDocument(response.data);
    } catch (err) {
      console.error('Failed to load EDM document', err);
      setError('Не удалось загрузить карточку документа.');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  const fetchDocumentKinds = useCallback(async () => {
    try {
      const response = await api.get<IEdmDocumentKind[]>('/edm/document-kinds', {
        params: { onlyActive: true },
      });
      setDocumentKinds(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to load document kinds', err);
    }
  }, []);

  const fetchTimelineBlocks = useCallback(async () => {
    if (!documentId) {
      return;
    }
    try {
      const [auditRes, historyRes, repliesRes] = await Promise.all([
        api.get<IEdmAuditEvent[]>(`/edm/documents/${documentId}/audit`),
        api.get<IEdmHistoryEvent[]>(`/edm/documents/${documentId}/history`),
        api.get<IEdmReply[]>(`/edm/documents/${documentId}/replies`),
      ]);
      setAuditEvents(Array.isArray(auditRes.data) ? auditRes.data : []);
      setHistoryEvents(Array.isArray(historyRes.data) ? historyRes.data : []);
      setReplies(Array.isArray(repliesRes.data) ? repliesRes.data : []);
    } catch (err) {
      console.error('Failed to load EDM timeline blocks', err);
    }
  }, [documentId]);

  const fetchAttachments = useCallback(async () => {
    if (!documentId) {
      return;
    }
    setAttachmentsLoading(true);
    try {
      const [linkedRes, filesRes] = await Promise.all([
        api.get<IEdmFileAttachment[]>(`/edm/documents/${documentId}/files`),
        api.get<IEdmFileAttachment[]>('/files'),
      ]);
      const linked = Array.isArray(linkedRes.data) ? linkedRes.data : [];
      const allFiles = Array.isArray(filesRes.data) ? filesRes.data : [];
      const linkedIds = new Set(linked.map((item) => item.id));
      const candidates = allFiles.filter(
        (item) => item.status === 'active' && !linkedIds.has(item.id),
      );

      setAttachments(linked);
      setAvailableFiles(candidates);
      if (!selectedFileId && candidates.length > 0) {
        setSelectedFileId(String(candidates[0].id));
      } else if (
        selectedFileId &&
        !candidates.some((item) => String(item.id) === selectedFileId)
      ) {
        setSelectedFileId(candidates.length > 0 ? String(candidates[0].id) : '');
      }
    } catch (err) {
      console.error('Failed to load EDM attachments', err);
    } finally {
      setAttachmentsLoading(false);
    }
  }, [documentId, selectedFileId]);

  useEffect(() => {
    if (!accessToken || !documentId) {
      return;
    }
    void fetchDocument();
    void fetchDocumentKinds();
    void fetchTimelineBlocks();
    void fetchAttachments();
  }, [
    accessToken,
    documentId,
    fetchAttachments,
    fetchDocument,
    fetchDocumentKinds,
    fetchTimelineBlocks,
  ]);

  const archiveDocument = async () => {
    if (!document) {
      return;
    }
    setArchiving(true);
    setError(null);
    try {
      await api.post(`/edm/documents/${document.id}/archive`);
      await fetchDocument();
    } catch (err) {
      console.error('Failed to archive EDM document', err);
      setError('Не удалось отправить документ в архив.');
    } finally {
      setArchiving(false);
    }
  };

  const submitToRoute = async () => {
    if (!document) {
      return;
    }
    setSubmittingToRoute(true);
    setError(null);
    try {
      await api.post(`/edm/documents/${document.id}/submit`, {});
      await fetchDocument();
      await fetchTimelineBlocks();
    } catch (err) {
      console.error('Failed to submit EDM document to route', err);
      setError('Не удалось отправить документ в маршрут.');
    } finally {
      setSubmittingToRoute(false);
    }
  };

  const sendReply = async () => {
    if (!document || !replyText.trim()) {
      return;
    }
    setReplySending(true);
    setError(null);
    try {
      await api.post(`/edm/documents/${document.id}/replies`, {
        messageText: replyText.trim(),
      });
      setReplyText('');
      await fetchTimelineBlocks();
    } catch (err) {
      console.error('Failed to create EDM reply', err);
      setError('Не удалось отправить сообщение в тред документа.');
    } finally {
      setReplySending(false);
    }
  };

  const executeStageAction = async (
    stageId: number,
    action: 'approved' | 'rejected' | 'returned_for_revision' | 'commented',
  ) => {
    if (!document) {
      return;
    }
    setStageActionLoadingId(stageId);
    setError(null);
    try {
      await api.post(`/edm/documents/${document.id}/stages/${stageId}/actions`, {
        action,
        commentText: stageCommentById[stageId]?.trim() || undefined,
      });
      await fetchDocument();
      await fetchTimelineBlocks();
    } catch (err) {
      console.error('Failed to execute EDM stage action', err);
      setError('Не удалось выполнить действие по этапу. Проверьте права и состояние этапа.');
    } finally {
      setStageActionLoadingId(null);
    }
  };

  const linkSelectedFile = async () => {
    if (!document || !selectedFileId) {
      return;
    }
    setLinkingFile(true);
    setError(null);
    try {
      await api.post(`/edm/documents/${document.id}/files/${selectedFileId}`);
      await fetchAttachments();
    } catch (err) {
      console.error('Failed to link EDM attachment', err);
      setError('Не удалось прикрепить файл к документу.');
    } finally {
      setLinkingFile(false);
    }
  };

  const unlinkFile = async (fileId: number) => {
    if (!document) {
      return;
    }
    setUnlinkingFileId(fileId);
    setError(null);
    try {
      await api.delete(`/edm/documents/${document.id}/files/${fileId}`);
      await fetchAttachments();
    } catch (err) {
      console.error('Failed to unlink EDM attachment', err);
      setError('Не удалось отвязать файл от документа.');
    } finally {
      setUnlinkingFileId(null);
    }
  };

  const updateStageComment = (stageId: number, value: string) => {
    setStageCommentById((prev) => ({
      ...prev,
      [stageId]: value,
    }));
  };

  const updateDocumentKind = async (documentKindId: number | null) => {
    if (!document) {
      return;
    }
    setSavingDocumentKind(true);
    setError(null);
    try {
      await api.patch(`/edm/documents/${document.id}`, {
        documentKindId,
      });
      await fetchDocument();
      await fetchTimelineBlocks();
    } catch (err) {
      console.error('Failed to update document kind', err);
      setError('Failed to update document kind');
    } finally {
      setSavingDocumentKind(false);
    }
  };

  const formatFileSize = (sizeBytes: string) => {
    const size = Number(sizeBytes);
    if (!Number.isFinite(size) || size <= 0) {
      return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    const exponent = Math.min(
      Math.floor(Math.log(size) / Math.log(1024)),
      units.length - 1,
    );
    const result = size / 1024 ** exponent;
    return `${result.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
  };

  return {
    document,
    auditEvents,
    historyEvents,
    replies,
    attachments,
    availableFiles,
    loading,
    error,
    archiving,
    submittingToRoute,
    attachmentsLoading,
    selectedFileId,
    linkingFile,
    unlinkingFileId,
    stageActionLoadingId,
    stageCommentById,
    replyText,
    replySending,
    documentKinds,
    savingDocumentKind,
    setSelectedFileId,
    setReplyText,
    updateStageComment,
    archiveDocument,
    submitToRoute,
    sendReply,
    executeStageAction,
    updateDocumentKind,
    linkSelectedFile,
    unlinkFile,
    formatFileSize,
  };
}
