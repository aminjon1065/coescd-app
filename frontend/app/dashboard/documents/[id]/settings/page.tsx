'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Shield,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  getDocument,
  listPermissions,
  grantPermission,
  revokePermission,
  updateDocumentMetadata,
} from '@/lib/api/documents-v2';
import { StatusBadgeV2 } from '@/components/edm/StatusBadgeV2';
import type { PermissionLevel } from '@/interfaces/IDocumentV2';

const PERMISSION_LABELS: Record<PermissionLevel, string> = {
  view: 'Просмотр',
  comment: 'Комментарии',
  edit: 'Редактирование',
  approve: 'Согласование',
  share: 'Общий доступ',
  delete: 'Удаление',
};

const PERMISSION_ORDER: PermissionLevel[] = ['view', 'comment', 'edit', 'approve', 'share', 'delete'];

export default function DocumentSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  // Metadata edit state
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [externalRef, setExternalRef] = useState('');
  const [metaSynced, setMetaSynced] = useState(false);

  // Share state
  const [shareUserId, setShareUserId] = useState('');
  const [sharePermission, setSharePermission] = useState<PermissionLevel>('view');

  const { data: doc, isLoading: docLoading } = useQuery({
    queryKey: ['document-v2', id],
    queryFn: () => getDocument(id),
  });

  useEffect(() => {
    if (doc && !metaSynced) {
      setTags(doc.tags ?? []);
      setExternalRef(doc.externalRef ?? '');
      setMetaSynced(true);
    }
  }, [doc, metaSynced]);

  const { data: perms = [], isLoading: permsLoading } = useQuery({
    queryKey: ['doc-perms', id],
    queryFn: () => listPermissions(id),
  });

  const metaMutation = useMutation({
    mutationFn: () => updateDocumentMetadata(id, { tags, externalRef: externalRef || null }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['document-v2', id] }),
  });

  const grantMutation = useMutation({
    mutationFn: () =>
      grantPermission(id, 'user', parseInt(shareUserId, 10), sharePermission),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doc-perms', id] });
      setShareUserId('');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (permId: string) => revokePermission(id, permId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doc-perms', id] }),
  });

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput('');
  };

  if (docLoading || !doc) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/documents/${id}`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-lg truncate">{doc.title}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadgeV2 status={doc.status} />
            <span className="text-xs text-muted-foreground">{doc.docType}</span>
          </div>
        </div>
      </div>

      {/* Metadata section */}
      <section className="rounded-xl border p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Метаданные</h2>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Внешний номер / реестровый №</Label>
          <Input
            value={externalRef}
            onChange={(e) => setExternalRef(e.target.value)}
            placeholder="Пр: 2026-КЧС-045"
            className="h-9"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Теги</Label>
          <div className="flex flex-wrap gap-1.5 mb-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 text-xs bg-[oklch(0.546_0.245_262.881)]/10 text-[oklch(0.546_0.245_262.881)] px-2 py-0.5 rounded-full"
              >
                {tag}
                <button
                  onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                  className="ml-0.5 hover:opacity-70"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
              placeholder="Добавить тег..."
              className="h-9"
            />
            <Button variant="outline" size="sm" onClick={addTag} className="shrink-0">
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => metaMutation.mutate()}
          disabled={metaMutation.isPending}
          className="self-start bg-[oklch(0.546_0.245_262.881)] hover:bg-[oklch(0.48_0.24_262.881)] text-white"
        >
          {metaMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
          Сохранить изменения
        </Button>
      </section>

      {/* Permissions section */}
      <section className="rounded-xl border p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Доступ</h2>
        </div>

        {/* Grant form */}
        <div className="flex flex-col gap-3 p-3 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground font-medium">Выдать доступ пользователю</p>
          <div className="flex gap-2">
            <Input
              type="number"
              value={shareUserId}
              onChange={(e) => setShareUserId(e.target.value)}
              placeholder="ID пользователя"
              className="h-9 flex-1"
            />
            <select
              value={sharePermission}
              onChange={(e) => setSharePermission(e.target.value as PermissionLevel)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {PERMISSION_ORDER.map((p) => (
                <option key={p} value={p}>{PERMISSION_LABELS[p]}</option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={() => grantMutation.mutate()}
              disabled={!shareUserId || grantMutation.isPending}
              className="bg-[oklch(0.546_0.245_262.881)] hover:bg-[oklch(0.48_0.24_262.881)] text-white"
            >
              {grantMutation.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <UserPlus className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        {/* Existing grants */}
        {permsLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : perms.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">Нет дополнительных прав</p>
        ) : (
          <div className="flex flex-col gap-2">
            {perms.map((perm) => (
              <div
                key={perm.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2.5 bg-card"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[oklch(0.546_0.245_262.881)] flex items-center justify-center text-white text-[10px] font-bold">
                    {perm.principalType.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-medium">
                      {perm.principalType} #{perm.principalId}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {PERMISSION_LABELS[perm.permission]}
                      {perm.expiresAt && ` · до ${new Date(perm.expiresAt).toLocaleDateString('ru')}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => revokeMutation.mutate(perm.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="Отозвать доступ"
                >
                  {revokeMutation.isPending
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
