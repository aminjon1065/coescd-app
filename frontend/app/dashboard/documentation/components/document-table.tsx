'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusIcon } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/context/auth-context';
import { IDocument, DocumentStatus } from '@/interfaces/IDocument';
import { CreateDocumentDialog } from './create-document-dialog';
import Link from 'next/link';
import { format } from 'date-fns';

const statusLabel: Record<DocumentStatus, string> = {
  draft: 'Черновик',
  sent: 'Отправлен',
  received: 'Получен',
  archived: 'В архиве',
};

const statusBadgeClass: Record<DocumentStatus, string> = {
  draft: 'bg-gray-500/15 text-gray-700 dark:text-gray-400',
  sent: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  received: 'bg-green-500/15 text-green-700 dark:text-green-400',
  archived: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
};

interface Props {
  title: string;
  type: string;
  defaultDocType?: string;
}

export function DocumentTable({ title, type, defaultDocType }: Props) {
  const { accessToken } = useAuth();
  const [documents, setDocuments] = useState<IDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents', { params: { type } });
      setDocuments(res.data);
    } catch (err) {
      console.error('Failed to load documents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    fetchDocuments();
  }, [accessToken, type]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <PlusIcon className="mr-2 h-4 w-4" />
            Создать документ
          </Button>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Нет документов</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/dashboard/documentation/${doc.id}`}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {doc.description}
                    </p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>От: {doc.sender?.name ?? '—'}</span>
                      {doc.receiver && <span>Кому: {doc.receiver.name}</span>}
                      <span>{format(new Date(doc.createdAt), 'dd.MM.yyyy')}</span>
                    </div>
                  </div>
                  <Badge className={statusBadgeClass[doc.status]} variant="outline">
                    {statusLabel[doc.status]}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateDocumentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={fetchDocuments}
        defaultType={defaultDocType}
      />
    </>
  );
}
