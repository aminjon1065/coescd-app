import { Link2Icon, UnlinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IEdmFileAttachment } from '@/interfaces/IEdmDocument';

interface Props {
  attachments: IEdmFileAttachment[];
  availableFiles: IEdmFileAttachment[];
  attachmentsLoading: boolean;
  selectedFileId: string;
  linkingFile: boolean;
  unlinkingFileId: number | null;
  onSelectedFileChange: (value: string) => void;
  onLinkSelectedFile: () => void;
  onUnlinkFile: (fileId: number) => void;
  formatFileSize: (sizeBytes: string) => string;
}

export function AttachmentsCard({
  attachments,
  availableFiles,
  attachmentsLoading,
  selectedFileId,
  linkingFile,
  unlinkingFileId,
  onSelectedFileChange,
  onLinkSelectedFile,
  onUnlinkFile,
  formatFileSize,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Вложения</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Select value={selectedFileId} onValueChange={onSelectedFileChange}>
            <SelectTrigger className="w-full md:w-80">
              <SelectValue placeholder="Выберите файл для привязки" />
            </SelectTrigger>
            <SelectContent>
              {availableFiles.length === 0 ? (
                <SelectItem value="none" disabled>
                  Нет доступных файлов
                </SelectItem>
              ) : (
                availableFiles.map((file) => (
                  <SelectItem key={file.id} value={String(file.id)}>
                    {file.originalName}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button onClick={onLinkSelectedFile} disabled={!selectedFileId || linkingFile}>
            <Link2Icon className="mr-2 h-4 w-4" />
            {linkingFile ? 'Привязка...' : 'Привязать'}
          </Button>
        </div>

        {attachmentsLoading ? (
          <p className="text-sm text-muted-foreground">Загрузка вложений...</p>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Вложений пока нет.</p>
        ) : (
          attachments.map((file) => (
            <div
              key={file.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{file.originalName}</p>
                <p className="text-xs text-muted-foreground">
                  {file.mimeType} • {formatFileSize(file.sizeBytes)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href={`/api/files/${file.id}/download`} target="_blank" rel="noreferrer">
                    Скачать
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onUnlinkFile(file.id)}
                  disabled={unlinkingFileId === file.id}
                >
                  <UnlinkIcon className="mr-2 h-4 w-4" />
                  {unlinkingFileId === file.id ? 'Отвязка...' : 'Отвязать'}
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
