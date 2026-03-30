import api from '@/lib/axios';
import { ListResponse } from '@/lib/list-response';
import { IFile } from '@/interfaces/IFile';
import { IFileShare } from '@/interfaces/IFileShare';

export interface GetFilesParams {
  page?: number;
  limit?: number;
  departmentId?: number;
  q?: string;
}

export interface UploadUrlResponse {
  uploadId: string;
  uploadUrl: string;
  fileId: number;
}

export const filesApi = {
  getFiles: (params: GetFilesParams = {}) =>
    api.get<ListResponse<IFile>>('/files', { params }).then((r) => r.data),

  uploadFile: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<IFile>('/files/upload', form).then((r) => r.data);
  },

  getPresignedUploadUrl: (payload: { fileName: string; mimeType: string; sizeBytes: number }) =>
    api.post<UploadUrlResponse>('/files/upload-url', payload).then((r) => r.data),

  completeUpload: (uploadId: string) =>
    api.post<IFile>(`/files/upload-complete/${uploadId}`).then((r) => r.data),

  getDownloadUrl: (fileId: number) =>
    api.get<{ url: string; expiresAt: string }>(`/files/${fileId}/download-url`).then((r) => r.data),

  deleteFile: (fileId: number) =>
    api.delete(`/files/${fileId}`),

  // Shares
  shareFile: (fileId: number, payload: { userId?: number; departmentId?: number; expiresAt?: string }) =>
    api.post<IFileShare>(`/files/${fileId}/shares`, payload).then((r) => r.data),

  getFileShares: (fileId: number) =>
    api.get<IFileShare[]>(`/files/${fileId}/shares`).then((r) => r.data),

  // Links (attach file to resource)
  getFileLinks: (fileId: number) =>
    api.get(`/files/${fileId}/links`).then((r) => r.data),

  createFileLink: (fileId: number, payload: { resourceType: string; resourceId: number }) =>
    api.post(`/files/${fileId}/links`, payload).then((r) => r.data),

  deleteFileLink: (fileId: number, linkId: number) =>
    api.delete(`/files/${fileId}/links/${linkId}`),
};
