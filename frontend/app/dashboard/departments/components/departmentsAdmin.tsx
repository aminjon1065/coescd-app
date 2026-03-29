'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import api from '@/lib/axios';
import Loading from '@/app/loading';
import { useAuth } from '@/context/auth-context';
import { Role } from '@/enums/RoleEnum';
import { DepartmentEnum } from '@/enums/DepartmentEnum';
import { IDepartment } from '@/interfaces/IDepartment';
import { IUser } from '@/interfaces/IUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Building2, ChevronRight, Loader2, Plus } from 'lucide-react';
import { extractListItems, ListResponse } from '@/lib/list-response';

// ── Constants ─────────────────────────────────────────────────────────────────

const NONE_VALUE = '__none__';

const DEPARTMENT_TYPES: DepartmentEnum[] = [
  DepartmentEnum.MAIN,
  DepartmentEnum.MANAGEMENT,
  DepartmentEnum.DIVISION,
  DepartmentEnum.SECTION,
];

const DEPT_TYPE_LABEL: Record<DepartmentEnum, string> = {
  [DepartmentEnum.MAIN]:       'Главное',
  [DepartmentEnum.MANAGEMENT]: 'Управление',
  [DepartmentEnum.DIVISION]:   'Отдел',
  [DepartmentEnum.SECTION]:    'Сектор',
};

const DEPT_TYPE_CLASSES: Record<DepartmentEnum, string> = {
  [DepartmentEnum.MAIN]:       'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  [DepartmentEnum.MANAGEMENT]: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  [DepartmentEnum.DIVISION]:   'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  [DepartmentEnum.SECTION]:    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

// ── Types ─────────────────────────────────────────────────────────────────────

type DeptForm = {
  name: string;
  type: DepartmentEnum;
  parentId: string;
  chiefId: string;
};

const FORM_EMPTY: DeptForm = {
  name: '',
  type: DepartmentEnum.SECTION,
  parentId: '',
  chiefId: '',
};

// ── Helper ────────────────────────────────────────────────────────────────────

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const r = (error as { response?: { data?: { message?: unknown } } }).response;
    const m = r?.data?.message;
    if (Array.isArray(m)) return m.join(', ');
    if (typeof m === 'string') return m;
  }
  return fallback;
}

// ── Department type badge ─────────────────────────────────────────────────────

function TypeBadge({ type }: { type: DepartmentEnum }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-current/10 ${DEPT_TYPE_CLASSES[type]}`}
    >
      {DEPT_TYPE_LABEL[type]}
    </span>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function DepartmentsAdmin() {
  const { loading, accessToken, user } = useAuth();
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [createForm, setCreateForm] = useState<DeptForm>(FORM_EMPTY);
  const [rowState, setRowState] = useState<Record<number, DeptForm>>({});
  const [busyById, setBusyById] = useState<Record<number, boolean>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const isAdmin = useMemo(() => user?.role === Role.Admin, [user?.role]);

  const setRowBusy = (id: number, v: boolean) =>
    setBusyById((prev) => ({ ...prev, [id]: v }));

  const loadData = async () => {
    const [deptsRes, usersRes] = await Promise.all([
      api.get<ListResponse<IDepartment> | IDepartment[]>('/department'),
      api.get<ListResponse<IUser> | IUser[]>('/users'),
    ]);
    const depts = extractListItems(deptsRes.data);
    setDepartments(depts);
    setUsers(extractListItems(usersRes.data));
    setRowState((prev) => {
      const next = { ...prev };
      for (const d of depts) {
        next[d.id] = next[d.id] ?? {
          name: d.name,
          type: d.type,
          parentId: d.parent?.id ? String(d.parent.id) : '',
          chiefId: d.chief?.id ? String(d.chief.id) : '',
        };
      }
      return next;
    });
  };

  useEffect(() => {
    if (!accessToken) return;
    loadData().catch((e) => setPageError(getApiErrorMessage(e, 'Не удалось загрузить данные')));
  }, [accessToken]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setPageError(null);
    setIsCreating(true);
    try {
      await api.post('/department', {
        name: createForm.name,
        type: createForm.type,
        parentId: createForm.parentId ? Number(createForm.parentId) : undefined,
        chiefId: createForm.chiefId ? Number(createForm.chiefId) : undefined,
      });
      setCreateForm(FORM_EMPTY);
      setShowCreateForm(false);
      await loadData();
    } catch (error: unknown) {
      setPageError(getApiErrorMessage(error, 'Не удалось создать подразделение'));
    } finally {
      setIsCreating(false);
    }
  };

  const onSave = async (dept: IDepartment) => {
    const state = rowState[dept.id];
    if (!state) return;
    setPageError(null);
    setRowBusy(dept.id, true);
    try {
      await api.patch(`/department/${dept.id}`, {
        name: state.name,
        type: state.type,
        parentId: state.parentId ? Number(state.parentId) : null,
        chiefId: state.chiefId ? Number(state.chiefId) : null,
      });
      await loadData();
      setExpandedId(null);
    } catch (error: unknown) {
      setPageError(getApiErrorMessage(error, 'Не удалось сохранить'));
    } finally {
      setRowBusy(dept.id, false);
    }
  };

  const onDelete = async (dept: IDepartment) => {
    if (!confirm(`Удалить подразделение «${dept.name}»?`)) return;
    setPageError(null);
    setRowBusy(dept.id, true);
    try {
      await api.delete(`/department/${dept.id}`);
      await loadData();
    } catch (error: unknown) {
      setPageError(getApiErrorMessage(error, 'Не удалось удалить подразделение'));
    } finally {
      setRowBusy(dept.id, false);
    }
  };

  if (loading || !accessToken) return <Loading />;

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Доступ запрещён. Требуется роль Администратора.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Подразделения</h1>
          <p className="text-xs text-muted-foreground">{departments.length} подразделений</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowCreateForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          Создать
        </Button>
      </div>

      {/* Error banner */}
      {pageError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {pageError}
        </div>
      )}

      {/* Create form */}
      {showCreateForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Новое подразделение</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onCreate}>
              <div className="space-y-1.5">
                <Label htmlFor="dname">Название</Label>
                <Input
                  id="dname"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Тип</Label>
                <Select
                  value={createForm.type}
                  onValueChange={(v) => setCreateForm((p) => ({ ...p, type: v as DepartmentEnum }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{DEPT_TYPE_LABEL[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Родительское подразделение</Label>
                <Select
                  value={createForm.parentId || NONE_VALUE}
                  onValueChange={(v) => setCreateForm((p) => ({ ...p, parentId: v === NONE_VALUE ? '' : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Не указано" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>Не указано</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Руководитель</Label>
                <Select
                  value={createForm.chiefId || NONE_VALUE}
                  onValueChange={(v) => setCreateForm((p) => ({ ...p, chiefId: v === NONE_VALUE ? '' : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Не назначен" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>Не назначен</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={isCreating} className="gap-1.5">
                  {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isCreating ? 'Создание...' : 'Создать подразделение'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowCreateForm(false)}>
                  Отмена
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Departments list */}
      <Card>
        <CardContent className="pt-4">
          {departments.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              <Skeleton className="h-full w-full rounded-lg" />
            </div>
          ) : (
            <div className="space-y-1.5">
              {departments.map((dept) => {
                const state = rowState[dept.id];
                const busy = !!busyById[dept.id];
                const isExpanded = expandedId === dept.id;
                if (!state) return null;

                return (
                  <div key={dept.id} className="rounded-lg border transition-colors hover:bg-muted/20">
                    {/* Row header */}
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                      onClick={() => setExpandedId(isExpanded ? null : dept.id)}
                    >
                      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
                        <span className="font-medium text-sm">{dept.name}</span>
                        <TypeBadge type={dept.type as DepartmentEnum} />
                        {dept.chief && (
                          <span className="text-xs text-muted-foreground">
                            Руководитель: {dept.chief.name}
                          </span>
                        )}
                        {dept.parent && (
                          <span className="text-xs text-muted-foreground">
                            → {dept.parent.name}
                          </span>
                        )}
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </button>

                    {/* Expanded edit form */}
                    {isExpanded && (
                      <div className="border-t px-4 py-3">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label>Название</Label>
                            <Input
                              value={state.name}
                              onChange={(e) =>
                                setRowState((p) => ({
                                  ...p,
                                  [dept.id]: { ...p[dept.id], name: e.target.value },
                                }))
                              }
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label>Тип</Label>
                            <Select
                              value={state.type}
                              onValueChange={(v) =>
                                setRowState((p) => ({
                                  ...p,
                                  [dept.id]: { ...p[dept.id], type: v as DepartmentEnum },
                                }))
                              }
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {DEPARTMENT_TYPES.map((t) => (
                                  <SelectItem key={t} value={t}>{DEPT_TYPE_LABEL[t]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label>Родительское подразделение</Label>
                            <Select
                              value={state.parentId || NONE_VALUE}
                              onValueChange={(v) =>
                                setRowState((p) => ({
                                  ...p,
                                  [dept.id]: { ...p[dept.id], parentId: v === NONE_VALUE ? '' : v },
                                }))
                              }
                            >
                              <SelectTrigger><SelectValue placeholder="Не указано" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NONE_VALUE}>Не указано</SelectItem>
                                {departments
                                  .filter((d) => d.id !== dept.id)
                                  .map((d) => (
                                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label>Руководитель</Label>
                            <Select
                              value={state.chiefId || NONE_VALUE}
                              onValueChange={(v) =>
                                setRowState((p) => ({
                                  ...p,
                                  [dept.id]: { ...p[dept.id], chiefId: v === NONE_VALUE ? '' : v },
                                }))
                              }
                            >
                              <SelectTrigger><SelectValue placeholder="Не назначен" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NONE_VALUE}>Не назначен</SelectItem>
                                {users.map((u) => (
                                  <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="mt-3 flex gap-2">
                          <Button size="sm" disabled={busy} className="gap-1.5" onClick={() => onSave(dept)}>
                            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Сохранить
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={busy}
                            onClick={() => onDelete(dept)}
                          >
                            Удалить
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setExpandedId(null)}>
                            Отмена
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
