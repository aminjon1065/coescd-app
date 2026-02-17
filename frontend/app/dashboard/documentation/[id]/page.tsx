'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeftIcon } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/context/auth-context';
import { IDocument, DocumentStatus, DocumentType } from '@/interfaces/IDocument';
import { format } from 'date-fns';

const statusLabel: Record<DocumentStatus, string> = {
  draft: 'Черновик',
  sent: 'Отправлен',
  received: 'Получен',
  archived: 'В архиве',
};

const typeLabel: Record<DocumentType, string> = {
  incoming: 'Входящий',
  outgoing: 'Исходящий',
  internal: 'Внутренний',
};

const statusBadgeClass: Record<DocumentStatus, string> = {
  draft: 'bg-gray-500/15 text-gray-700 dark:text-gray-400',
  sent: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  received: 'bg-green-500/15 text-green-700 dark:text-green-400',
  archived: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
};

export default function DocumentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { accessToken } = useAuth();
  const [doc, setDoc] = useState<IDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!accessToken || !id) return;
    api
      .get(`/documents/${id}`)
      .then((res) => setDoc(res.data))
      .catch((err) => console.error('Failed to load document', err))
      .finally(() => setLoading(false));
  }, [accessToken, id]);

  const handleStatusChange = async (newStatus: DocumentStatus) => {
    if (!doc) return;
    setUpdating(true);
    try {
      const res = await api.patch(`/documents/${doc.id}`, { status: newStatus });
      setDoc(res.data);
    } catch (err) {
      console.error('Failed to update document', err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!doc) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Документ не найден</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            Назад
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/dashboard/documentation')}
      >
        <ArrowLeftIcon className="mr-2 h-4 w-4" />
        Назад к документам
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{doc.title}</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">{typeLabel[doc.type]}</Badge>
            <Badge className={statusBadgeClass[doc.status]} variant="outline">
              {statusLabel[doc.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Содержание</h3>
            <p className="text-sm whitespace-pre-wrap">{doc.description}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Отправитель</h3>
              <p className="text-sm">{doc.sender?.name ?? '—'}</p>
              <p className="text-xs text-muted-foreground">{doc.sender?.email}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Получатель</h3>
              <p className="text-sm">{doc.receiver?.name ?? '—'}</p>
              <p className="text-xs text-muted-foreground">{doc.receiver?.email}</p>
            </div>
          </div>

          {doc.department && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Отдел</h3>
              <p className="text-sm">{doc.department.name}</p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Создан</h3>
              <p className="text-sm">
                {format(new Date(doc.createdAt), 'dd.MM.yyyy HH:mm')}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Обновлен</h3>
              <p className="text-sm">
                {format(new Date(doc.updatedAt), 'dd.MM.yyyy HH:mm')}
              </p>
            </div>
          </div>

          {doc.status === 'draft' && (
            <div className="flex gap-2">
              <Button
                onClick={() => handleStatusChange('sent')}
                disabled={updating}
                className="flex-1"
              >
                {updating ? 'Обновление...' : 'Отправить'}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleStatusChange('archived')}
                disabled={updating}
                className="flex-1"
              >
                В архив
              </Button>
            </div>
          )}
          {doc.status === 'sent' && (
            <Button
              variant="outline"
              onClick={() => handleStatusChange('archived')}
              disabled={updating}
              className="w-full"
            >
              {updating ? 'Обновление...' : 'В архив'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
