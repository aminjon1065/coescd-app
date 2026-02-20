'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { edmApi } from '@/lib/edm';
import { useAuth } from '@/context/auth-context';
import {
  IEdmDocumentKind,
  IEdmDocumentKindCreateDto,
  IEdmDocumentKindUpdateDto,
} from '@/interfaces/IEdmDocument';
import { can } from '@/features/authz/can';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DocumentationLang } from '../i18n';

type FormState = {
  code: string;
  name: string;
  description: string;
  isActive: boolean;
};

type Props = {
  lang?: DocumentationLang;
};

const labels = {
  ru: {
    title: 'Типы документов',
    newKind: 'Новый тип',
    search: 'Поиск по коду или названию',
    activeOnly: 'Только активные',
    refresh: 'Обновить',
    loadError: 'Не удалось загрузить типы документов',
    saveError: 'Не удалось сохранить тип документа',
    deactivateError: 'Не удалось деактивировать тип документа',
    requiredError: 'Код и название обязательны',
    code: 'Код',
    name: 'Название',
    description: 'Описание',
    status: 'Статус',
    actions: 'Действия',
    noData: 'Типы документов не найдены',
    active: 'Активный',
    inactive: 'Неактивный',
    readOnly: 'Только чтение',
    edit: 'Редактировать тип документа',
    create: 'Создать тип документа',
    placeholderCode: 'contract_letter',
    placeholderName: 'Сопроводительное письмо',
    save: 'Сохранить',
    saving: 'Сохранение...',
    enabled: 'Активен',
  },
  tj: {
    title: 'Навъҳои ҳуҷҷат',
    newKind: 'Навъи нав',
    search: 'Ҷустуҷӯ аз рӯйи рамз ё ном',
    activeOnly: 'Танҳо фаъол',
    refresh: 'Навсозӣ',
    loadError: 'Боркунии навъҳои ҳуҷҷат имконнопазир аст',
    saveError: 'Захираи навъи ҳуҷҷат имконнопазир аст',
    deactivateError: 'Ғайрифаъолсозии навъи ҳуҷҷат имконнопазир аст',
    requiredError: 'Рамз ва ном ҳатмӣ мебошанд',
    code: 'Рамз',
    name: 'Ном',
    description: 'Тавсиф',
    status: 'Ҳолат',
    actions: 'Амалҳо',
    noData: 'Навъҳои ҳуҷҷат ёфт нашуданд',
    active: 'Фаъол',
    inactive: 'Ғайрифаъол',
    readOnly: 'Танҳо хондан',
    edit: 'Таҳрири навъи ҳуҷҷат',
    create: 'Эҷоди навъи ҳуҷҷат',
    placeholderCode: 'contract_letter',
    placeholderName: 'Номаи ҳамроҳӣ',
    save: 'Захира',
    saving: 'Дар ҳоли захира...',
    enabled: 'Фаъол',
  },
} as const;

const emptyForm: FormState = {
  code: '',
  name: '',
  description: '',
  isActive: true,
};

export function DocumentKindsManager({ lang = 'ru' }: Props) {
  const t = labels[lang];
  const { accessToken, user } = useAuth();
  const [items, setItems] = useState<IEdmDocumentKind[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [onlyActive, setOnlyActive] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IEdmDocumentKind | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const canManageKinds = useMemo(
    () =>
      can(user, {
        anyPermissions: ['documents.templates.write'],
      }),
    [user],
  );

  const fetchKinds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await edmApi.listDocumentKinds({
        q: q.trim() || undefined,
        onlyActive,
      });
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load document kinds', err);
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [onlyActive, q, t.loadError]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    void fetchKinds();
  }, [accessToken, fetchKinds]);

  const openCreate = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (item: IEdmDocumentKind) => {
    setEditingItem(item);
    setForm({
      code: item.code,
      name: item.name,
      description: item.description ?? '',
      isActive: item.isActive,
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!canManageKinds) {
      return;
    }
    if (!form.code.trim() || !form.name.trim()) {
      setError(t.requiredError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (editingItem) {
        const payload: IEdmDocumentKindUpdateDto = {
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description.trim() || null,
          isActive: form.isActive,
        };
        await edmApi.updateDocumentKind(editingItem.id, payload);
      } else {
        const payload: IEdmDocumentKindCreateDto = {
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          isActive: form.isActive,
        };
        await edmApi.createDocumentKind(payload);
      }
      setOpen(false);
      await fetchKinds();
    } catch (err) {
      console.error('Failed to save document kind', err);
      setError(t.saveError);
    } finally {
      setSubmitting(false);
    }
  };

  const deactivate = async (item: IEdmDocumentKind) => {
    if (!canManageKinds) {
      return;
    }
    try {
      await edmApi.deleteDocumentKind(item.id);
      await fetchKinds();
    } catch (err) {
      console.error('Failed to deactivate document kind', err);
      setError(t.deactivateError);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t.title}</CardTitle>
        {canManageKinds ? (
          <Button size="sm" onClick={openCreate}>
            <PlusIcon className="mr-2 h-4 w-4" />
            {t.newKind}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            placeholder={t.search}
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={onlyActive}
              onCheckedChange={(value) => setOnlyActive(Boolean(value))}
            />
            {t.activeOnly}
          </label>
          <Button variant="outline" onClick={() => void fetchKinds()} disabled={loading}>
            {t.refresh}
          </Button>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{t.code}</th>
                <th className="px-3 py-2">{t.name}</th>
                <th className="px-3 py-2">{t.description}</th>
                <th className="px-3 py-2">{t.status}</th>
                <th className="px-3 py-2">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    {t.noData}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-t hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{item.code}</td>
                    <td className="px-3 py-2">{item.name}</td>
                    <td className="px-3 py-2">{item.description ?? '—'}</td>
                    <td className="px-3 py-2">
                      <Badge variant={item.isActive ? 'default' : 'outline'}>
                        {item.isActive ? t.active : t.inactive}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {canManageKinds ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(item)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => void deactivate(item)}
                            disabled={!item.isActive}
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        t.readOnly
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? t.edit : t.create}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="kind-code">{t.code}</Label>
              <Input
                id="kind-code"
                value={form.code}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, code: event.target.value }))
                }
                placeholder={t.placeholderCode}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kind-name">{t.name}</Label>
              <Input
                id="kind-name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder={t.placeholderName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kind-description">{t.description}</Label>
              <Input
                id="kind-description"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.isActive}
                onCheckedChange={(value) =>
                  setForm((prev) => ({ ...prev, isActive: Boolean(value) }))
                }
              />
              {t.enabled}
            </label>
            <Button onClick={() => void submit()} disabled={submitting} className="w-full">
              {submitting ? t.saving : t.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}


