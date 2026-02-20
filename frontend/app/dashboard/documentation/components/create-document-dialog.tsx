'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/lib/axios';
import { edmApi } from '@/lib/edm';
import { IDepartment } from '@/interfaces/IDepartment';
import { EdmDocumentType, IEdmDocumentKind } from '@/interfaces/IEdmDocument';
import { DocumentationLang } from '../i18n';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  defaultType?: EdmDocumentType;
  lang?: DocumentationLang;
}

const labels = {
  ru: {
    loadDepartmentsError: 'Не удалось загрузить департаменты',
    createError: 'Не удалось создать документ',
    title: 'Новая карточка документа',
    documentTitle: 'Заголовок',
    documentTitlePlaceholder: 'Служебная записка о...',
    subject: 'Тема',
    subjectPlaceholder: 'Краткая тема',
    summary: 'Краткое содержание',
    summaryPlaceholder: 'Краткое описание документа',
    documentType: 'Тип документа',
    incoming: 'Входящий',
    outgoing: 'Исходящий',
    internal: 'Внутренний',
    order: 'Приказ',
    resolution: 'Резолюция',
    confidentiality: 'Уровень доступа',
    accessInternal: 'Внутренний доступ',
    accessDepartment: 'Конфиденциально (департамент)',
    accessRestricted: 'Ограниченный доступ',
    kind: 'Тип (справочник)',
    noKind: 'Без типа',
    department: 'Департамент',
    selectDepartment: 'Выберите департамент',
    dueDate: 'Срок исполнения',
    creating: 'Создание...',
    create: 'Создать',
  },
  tj: {
    loadDepartmentsError: 'Боркунии департаментҳо муяссар нашуд',
    createError: 'Эҷоди ҳуҷҷат муяссар нашуд',
    title: 'Корти нави ҳуҷҷат',
    documentTitle: 'Сарлавҳа',
    documentTitlePlaceholder: 'Ёддошти хизматӣ дар бораи...',
    subject: 'Мавзӯъ',
    subjectPlaceholder: 'Мавзӯи кӯтоҳ',
    summary: 'Мазмуни кӯтоҳ',
    summaryPlaceholder: 'Тавсифи кӯтоҳи ҳуҷҷат',
    documentType: 'Навъи ҳуҷҷат',
    incoming: 'Воридот',
    outgoing: 'Содирот',
    internal: 'Дохилӣ',
    order: 'Фармон',
    resolution: 'Қатънома',
    confidentiality: 'Сатҳи дастрасӣ',
    accessInternal: 'Дастрасии дохилӣ',
    accessDepartment: 'Маҳрамона (департамент)',
    accessRestricted: 'Дастрасии маҳдуд',
    kind: 'Навъ (феҳрист)',
    noKind: 'Бе навъ',
    department: 'Департамент',
    selectDepartment: 'Департаментро интихоб кунед',
    dueDate: 'Муҳлати иҷро',
    creating: 'Дар ҳоли эҷод...',
    create: 'Эҷод',
  },
} as const;

export function CreateDocumentDialog({
  open,
  onOpenChange,
  onCreated,
  defaultType,
  lang = 'ru',
}: Props) {
  const t = labels[lang];
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [summary, setSummary] = useState('');
  const [type, setType] = useState<EdmDocumentType>(defaultType ?? 'incoming');
  const [confidentiality, setConfidentiality] = useState<
    'public_internal' | 'department_confidential' | 'restricted'
  >('department_confidential');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [dueAt, setDueAt] = useState('');
  const [documentKinds, setDocumentKinds] = useState<IEdmDocumentKind[]>([]);
  const [documentKindId, setDocumentKindId] = useState<string>('none');
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultDepartmentId = useMemo(
    () => (departments.length > 0 ? String(departments[0].id) : ''),
    [departments],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);

    void api
      .get<IDepartment[]>('/department')
      .then((res) => {
        setDepartments(res.data);
        if (!departmentId) {
          setDepartmentId(res.data.length > 0 ? String(res.data[0].id) : '');
        }
      })
      .catch((err) => {
        console.error('Failed to load departments', err);
        setError(t.loadDepartmentsError);
      });

    void edmApi
      .listDocumentKinds({ onlyActive: true })
      .then((items) => setDocumentKinds(items))
      .catch((err) => {
        console.error('Failed to load document kinds', err);
      });
  }, [departmentId, open, t.loadDepartmentsError]);

  useEffect(() => {
    if (defaultType) {
      setType(defaultType);
    }
  }, [defaultType]);

  const resetForm = () => {
    setTitle('');
    setSubject('');
    setSummary('');
    setType(defaultType ?? 'incoming');
    setConfidentiality('department_confidential');
    setDueAt('');
    setDocumentKindId('none');
    setDepartmentId(defaultDepartmentId);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await api.post('/edm/documents', {
        title,
        subject: subject || undefined,
        summary: summary || undefined,
        type,
        confidentiality,
        departmentId: Number(departmentId),
        dueAt: dueAt ? new Date(`${dueAt}T23:59:59.999Z`).toISOString() : undefined,
        documentKindId: documentKindId === 'none' ? undefined : Number(documentKindId),
      });
      onOpenChange(false);
      resetForm();
      onCreated();
    } catch (err) {
      console.error('Failed to create EDM document', err);
      setError(t.createError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t.documentTitle}</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t.documentTitlePlaceholder}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">{t.subject}</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder={t.subjectPlaceholder}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">{t.summary}</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder={t.summaryPlaceholder}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.documentType}</Label>
              <Select value={type} onValueChange={(value: EdmDocumentType) => setType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incoming">{t.incoming}</SelectItem>
                  <SelectItem value="outgoing">{t.outgoing}</SelectItem>
                  <SelectItem value="internal">{t.internal}</SelectItem>
                  <SelectItem value="order">{t.order}</SelectItem>
                  <SelectItem value="resolution">{t.resolution}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t.confidentiality}</Label>
              <Select
                value={confidentiality}
                onValueChange={(
                  value: 'public_internal' | 'department_confidential' | 'restricted',
                ) => setConfidentiality(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public_internal">{t.accessInternal}</SelectItem>
                  <SelectItem value="department_confidential">{t.accessDepartment}</SelectItem>
                  <SelectItem value="restricted">{t.accessRestricted}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.kind}</Label>
              <Select value={documentKindId} onValueChange={setDocumentKindId}>
                <SelectTrigger>
                  <SelectValue placeholder={t.noKind} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.noKind}</SelectItem>
                  {documentKinds.map((kind) => (
                    <SelectItem key={kind.id} value={String(kind.id)}>
                      {kind.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t.department}</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder={t.selectDepartment} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={String(department.id)}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueAt">{t.dueDate}</Label>
            <Input
              id="dueAt"
              type="date"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? t.creating : t.create}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}


