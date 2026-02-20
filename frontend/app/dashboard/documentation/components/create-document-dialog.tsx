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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  defaultType?: EdmDocumentType;
}

const confidentialityOptions = [
  { value: 'public_internal', label: 'Внутренний доступ' },
  { value: 'department_confidential', label: 'Конфиденциально (департамент)' },
  { value: 'restricted', label: 'Ограниченный доступ' },
] as const;

export function CreateDocumentDialog({
  open,
  onOpenChange,
  onCreated,
  defaultType,
}: Props) {
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
        setError('Не удалось загрузить департаменты');
      });

    void edmApi
      .listDocumentKinds({ onlyActive: true })
      .then((items) => setDocumentKinds(items))
      .catch((err) => {
        console.error('Failed to load document kinds', err);
      });
  }, [departmentId, open]);

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
      setError('Не удалось создать документ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая карточка документа</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Заголовок</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Служебная записка о..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Тема</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Краткая тема"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Краткое содержание</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Краткое описание документа"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Тип документа</Label>
              <Select value={type} onValueChange={(value: EdmDocumentType) => setType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incoming">Входящий</SelectItem>
                  <SelectItem value="outgoing">Исходящий</SelectItem>
                  <SelectItem value="internal">Внутренний</SelectItem>
                  <SelectItem value="order">Приказ</SelectItem>
                  <SelectItem value="resolution">Резолюция</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Уровень доступа</Label>
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
                  {confidentialityOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Тип (справочник)</Label>
              <Select value={documentKindId} onValueChange={setDocumentKindId}>
                <SelectTrigger>
                  <SelectValue placeholder="Без типа" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без типа</SelectItem>
                  {documentKinds.map((kind) => (
                    <SelectItem key={kind.id} value={String(kind.id)}>
                      {kind.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Департамент</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите департамент" />
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
            <Label htmlFor="dueAt">Срок исполнения</Label>
            <Input
              id="dueAt"
              type="date"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Создание...' : 'Создать'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
