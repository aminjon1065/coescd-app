'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DownloadIcon,
  FileIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/context/auth-context';
import { IFile } from '@/interfaces/IFile';
import { ListResponse } from '@/lib/list-response';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';
import { hasPermission, Permission } from '@/lib/permissions';
import { format } from 'date-fns';

function formatBytes(bytes: string | number): string {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function mimeLabel(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.startsWith('image/')) return mimeType.split('/')[1].toUpperCase();
  return mimeType.split('/').pop()?.toUpperCase() ?? mimeType;
}

export default function FilesPage() {
  return (
    <ProtectedRouteGate
      policyKey="dashboard.files"
      deniedDescription="Раздел файлов доступен пользователям с правом чтения файлов."
    >
      <FilesContent />
    </ProtectedRouteGate>
  );
}

function FilesContent() {
  const { accessToken, user } = useAuth();
  const [files, setFiles] = useState<IFile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canWrite = hasPermission(Permission.FILES_WRITE);
  const canDelete = hasPermission(Permission.FILES_DELETE);

  const fetchFiles = async (q?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '50' };
      if (q) params.q = q;
      const res = await api.get<ListResponse<IFile>>('/files', { params });
      setFiles(res.data.items ?? []);
      setTotal(res.data.total ?? 0);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    fetchFiles();
  }, [accessToken]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFiles(search.trim() || undefined);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const form = new FormData();
    form.append('file', file);
    try {
      await api.post('/files/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchFiles(search.trim() || undefined);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Ошибка загрузки файла';
      setUploadError(typeof msg === 'string' ? msg : 'Ошибка загрузки файла');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (file: IFile) => {
    try {
      const res = await api.get<{ downloadUrl: string }>(
        `/files/${file.id}/download-url`,
      );
      window.open(res.data.downloadUrl, '_blank');
    } catch {
      // fallback: direct download stream
      const res = await api.get(`/files/${file.id}/download`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDelete = async (file: IFile) => {
    if (!confirm(`Удалить файл «${file.originalName}»?`)) return;
    try {
      await api.delete(`/files/${file.id}`);
      await fetchFiles(search.trim() || undefined);
    } catch {
      // silently ignore — list will re-fetch
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Файлы ({total})</CardTitle>
        {canWrite && (
          <div className="flex flex-col items-end gap-1">
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <UploadIcon className="mr-2 h-4 w-4" />
              {uploading ? 'Загрузка…' : 'Загрузить'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={handleUpload}
            />
            {uploadError && (
              <p className="text-xs text-destructive">{uploadError}</p>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Поиск по имени файла…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Button type="submit" variant="outline" size="sm">
            <SearchIcon className="h-4 w-4" />
          </Button>
        </form>

        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Файлы не найдены</p>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="font-medium truncate max-w-xs">
                      {file.originalName}
                    </p>
                    <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
                      <span>{mimeLabel(file.mimeType)}</span>
                      <span>{formatBytes(file.sizeBytes)}</span>
                      {file.owner && <span>{file.owner.name}</span>}
                      {file.department && (
                        <span>{file.department.name}</span>
                      )}
                      <span>
                        {format(new Date(file.createdAt), 'dd.MM.yyyy')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {mimeLabel(file.mimeType)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Скачать"
                    onClick={() => handleDownload(file)}
                  >
                    <DownloadIcon className="h-4 w-4" />
                  </Button>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Удалить"
                      onClick={() => handleDelete(file)}
                    >
                      <Trash2Icon className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
