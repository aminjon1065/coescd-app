'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import api from '@/lib/axios';
import Loading from '@/app/loading';
import { useAuth } from '@/context/auth-context';
import { Role } from '@/enums/RoleEnum';
import { DepartmentEnum } from '@/enums/DepartmentEnum';
import { IDepartment } from '@/interfaces/IDepartment';
import { IUser } from '@/interfaces/IUser';
import { IOrgUnit } from '@/interfaces/IOrgUnit';
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
import { useOrgUnitsQuery } from '@/hooks/queries/useOrgUnits';

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

const ORG_UNIT_TYPE_LABEL: Record<string, string> = {
  committee: 'Комитет',
  department: 'Управление',
  division: 'Отдел/Отделение',
};

const ORG_UNIT_TYPES = ['committee', 'department', 'division'] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

type DeptForm = {
  name: string;
  type: DepartmentEnum;
  parentId: string;
  chiefId: string;
};

type OrgUnitTreeNode = IOrgUnit & { childrenNodes: OrgUnitTreeNode[] };

type OrgUnitForm = {
  name: string;
  type: (typeof ORG_UNIT_TYPES)[number];
  parentId: string;
};

const FORM_EMPTY: DeptForm = {
  name: '',
  type: DepartmentEnum.SECTION,
  parentId: '',
  chiefId: '',
};

const ORG_UNIT_FORM_EMPTY: OrgUnitForm = {
  name: '',
  type: 'division',
  parentId: '',
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

function OrgUnitTypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-current/10 dark:bg-amber-950 dark:text-amber-300">
      {ORG_UNIT_TYPE_LABEL[type] ?? type}
    </span>
  );
}

function buildOrgUnitTree(orgUnits: IOrgUnit[]): OrgUnitTreeNode[] {
  const byParent = new Map<number | null, IOrgUnit[]>();

  for (const orgUnit of orgUnits) {
    const parentId = orgUnit.parent?.id ?? null;
    const bucket = byParent.get(parentId) ?? [];
    bucket.push(orgUnit);
    byParent.set(parentId, bucket);
  }

  for (const bucket of byParent.values()) {
    bucket.sort((a, b) => a.name.localeCompare(b.name));
  }

  const attachChildren = (node: IOrgUnit): OrgUnitTreeNode => ({
    ...node,
    childrenNodes: (byParent.get(node.id) ?? []).map(attachChildren),
  });

  return (byParent.get(null) ?? []).map(attachChildren);
}

function OrgUnitTree({
  nodes,
  allNodes,
  level = 0,
  rowState,
  busyById,
  expandedId,
  setExpandedId,
  setRowState,
  onSave,
  onDelete,
}: {
  nodes: OrgUnitTreeNode[];
  allNodes: OrgUnitTreeNode[];
  level?: number;
  rowState: Record<number, OrgUnitForm>;
  busyById: Record<number, boolean>;
  expandedId: number | null;
  setExpandedId: (id: number | null) => void;
  setRowState: React.Dispatch<React.SetStateAction<Record<number, OrgUnitForm>>>;
  onSave: (orgUnit: IOrgUnit) => void;
  onDelete: (orgUnit: IOrgUnit) => void;
}) {
  return (
    <div className="space-y-2">
      {nodes.map((node) => (
        <div key={node.id} className="space-y-2">
          <div
            className="rounded-lg border p-3"
            style={{ marginLeft: `${level * 20}px` }}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 text-left"
              onClick={() => setExpandedId(expandedId === node.id ? null : node.id)}
            >
              <span className="font-medium text-sm">{node.name}</span>
              <OrgUnitTypeBadge type={node.type} />
              {node.path && (
                <span className="text-xs text-muted-foreground">{node.path}</span>
              )}
              <ChevronRight
                className={`ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expandedId === node.id ? 'rotate-90' : ''}`}
              />
            </button>
            {expandedId === node.id && rowState[node.id] && (
              <div className="mt-3 grid grid-cols-1 gap-3 border-t pt-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Название</Label>
                  <Input
                    value={rowState[node.id].name}
                    onChange={(e) =>
                      setRowState((prev) => ({
                        ...prev,
                        [node.id]: { ...prev[node.id], name: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Тип</Label>
                  <Select
                    value={rowState[node.id].type}
                    onValueChange={(value) =>
                      setRowState((prev) => ({
                        ...prev,
                        [node.id]: { ...prev[node.id], type: value as OrgUnitForm['type'] },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORG_UNIT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {ORG_UNIT_TYPE_LABEL[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Родительская оргединица</Label>
                  <Select
                    value={rowState[node.id].parentId || NONE_VALUE}
                    onValueChange={(value) =>
                      setRowState((prev) => ({
                        ...prev,
                        [node.id]: {
                          ...prev[node.id],
                          parentId: value === NONE_VALUE ? '' : value,
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Не указано" />
                    </SelectTrigger>
                    <SelectContent>
                      <OrgUnitParentOptions options={allNodes} excludeId={node.id} />
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 md:col-span-2">
                  <Button
                    size="sm"
                    disabled={!!busyById[node.id]}
                    className="gap-1.5"
                    onClick={() => onSave(node)}
                  >
                    {busyById[node.id] && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Сохранить
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={!!busyById[node.id]}
                    onClick={() => onDelete(node)}
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
          {node.childrenNodes.length > 0 && (
            <OrgUnitTree
              nodes={node.childrenNodes}
              allNodes={allNodes}
              level={level + 1}
              rowState={rowState}
              busyById={busyById}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              setRowState={setRowState}
              onSave={onSave}
              onDelete={onDelete}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function flattenOrgUnitTree(nodes: OrgUnitTreeNode[], acc: OrgUnitTreeNode[] = []): OrgUnitTreeNode[] {
  for (const node of nodes) {
    acc.push(node);
    flattenOrgUnitTree(node.childrenNodes, acc);
  }
  return acc;
}

function OrgUnitParentOptions({
  options,
  excludeId,
}: {
  options: OrgUnitTreeNode[];
  excludeId?: number;
}) {
  const flat = flattenOrgUnitTree(options).filter((item) => item.id !== excludeId);

  return (
    <>
      <SelectItem value={NONE_VALUE}>Не указано</SelectItem>
      {flat.map((orgUnit) => (
        <SelectItem key={orgUnit.id} value={String(orgUnit.id)}>
          {orgUnit.name}
        </SelectItem>
      ))}
    </>
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
  const [orgUnitRowState, setOrgUnitRowState] = useState<Record<number, OrgUnitForm>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingOrgUnit, setIsCreatingOrgUnit] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCreateOrgUnitForm, setShowCreateOrgUnitForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedOrgUnitId, setExpandedOrgUnitId] = useState<number | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [orgUnitCreateForm, setOrgUnitCreateForm] = useState<OrgUnitForm>(ORG_UNIT_FORM_EMPTY);

  const isAdmin = useMemo(() => user?.role === Role.Admin, [user?.role]);
  const {
    data: orgUnits = [],
    isLoading: orgUnitsLoading,
    isError: orgUnitsError,
  } = useOrgUnitsQuery(!!accessToken && isAdmin);
  const orgUnitTree = useMemo(() => buildOrgUnitTree(orgUnits), [orgUnits]);

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
    setOrgUnitRowState((prev) => {
      const next = { ...prev };
      for (const orgUnit of orgUnits) {
        next[orgUnit.id] = next[orgUnit.id] ?? {
          name: orgUnit.name,
          type: (ORG_UNIT_TYPES.includes(orgUnit.type as OrgUnitForm['type'])
            ? orgUnit.type
            : 'division') as OrgUnitForm['type'],
          parentId: orgUnit.parent?.id ? String(orgUnit.parent.id) : '',
        };
      }
      return next;
    });
  }, [orgUnits]);

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

  const onCreateOrgUnit = async (e: FormEvent) => {
    e.preventDefault();
    setPageError(null);
    setIsCreatingOrgUnit(true);
    try {
      await api.post('/org-units', {
        name: orgUnitCreateForm.name,
        type: orgUnitCreateForm.type,
        parentId: orgUnitCreateForm.parentId ? Number(orgUnitCreateForm.parentId) : undefined,
      });
      setOrgUnitCreateForm(ORG_UNIT_FORM_EMPTY);
      setShowCreateOrgUnitForm(false);
      await loadData();
    } catch (error: unknown) {
      setPageError(getApiErrorMessage(error, 'Не удалось создать оргединицу'));
    } finally {
      setIsCreatingOrgUnit(false);
    }
  };

  const onSaveOrgUnit = async (orgUnit: IOrgUnit) => {
    const state = orgUnitRowState[orgUnit.id];
    if (!state) return;
    setPageError(null);
    setRowBusy(orgUnit.id, true);
    try {
      await api.patch(`/org-units/${orgUnit.id}`, {
        name: state.name,
        type: state.type,
        parentId: state.parentId ? Number(state.parentId) : null,
      });
      await loadData();
      setExpandedOrgUnitId(null);
    } catch (error: unknown) {
      setPageError(getApiErrorMessage(error, 'Не удалось сохранить оргединицу'));
    } finally {
      setRowBusy(orgUnit.id, false);
    }
  };

  const onDeleteOrgUnit = async (orgUnit: IOrgUnit) => {
    if (!confirm(`Удалить оргединицу «${orgUnit.name}»?`)) return;
    setPageError(null);
    setRowBusy(orgUnit.id, true);
    try {
      await api.delete(`/org-units/${orgUnit.id}`);
      await loadData();
      setExpandedOrgUnitId(null);
    } catch (error: unknown) {
      setPageError(getApiErrorMessage(error, 'Не удалось удалить оргединицу'));
    } finally {
      setRowBusy(orgUnit.id, false);
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
      {(pageError || orgUnitsError) && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {pageError ?? 'Не удалось загрузить оргструктуру.'}
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Оргструктура КЧС</CardTitle>
          <p className="text-xs text-muted-foreground">
            Управляемая структура `org_units`, которая используется для scope и иерархии доступа.
          </p>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex justify-end">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setShowCreateOrgUnitForm((v) => !v)}
            >
              <Plus className="h-4 w-4" />
              Создать оргединицу
            </Button>
          </div>
          {showCreateOrgUnitForm && (
            <form className="mb-4 grid grid-cols-1 gap-3 rounded-lg border p-4 md:grid-cols-2" onSubmit={onCreateOrgUnit}>
              <div className="space-y-1.5">
                <Label>Название</Label>
                <Input
                  value={orgUnitCreateForm.name}
                  onChange={(e) =>
                    setOrgUnitCreateForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Тип</Label>
                <Select
                  value={orgUnitCreateForm.type}
                  onValueChange={(value) =>
                    setOrgUnitCreateForm((prev) => ({
                      ...prev,
                      type: value as OrgUnitForm['type'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORG_UNIT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {ORG_UNIT_TYPE_LABEL[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Родительская оргединица</Label>
                <Select
                  value={orgUnitCreateForm.parentId || NONE_VALUE}
                  onValueChange={(value) =>
                    setOrgUnitCreateForm((prev) => ({
                      ...prev,
                      parentId: value === NONE_VALUE ? '' : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Не указано" />
                  </SelectTrigger>
                  <SelectContent>
                    <OrgUnitParentOptions options={orgUnitTree} />
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={isCreatingOrgUnit} className="gap-1.5">
                  {isCreatingOrgUnit && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isCreatingOrgUnit ? 'Создание...' : 'Создать оргединицу'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowCreateOrgUnitForm(false)}>
                  Отмена
                </Button>
              </div>
            </form>
          )}
          {orgUnitsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Skeleton key={idx} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : orgUnits.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Оргединицы пока не настроены.
            </p>
          ) : (
            <OrgUnitTree
              nodes={orgUnitTree}
              allNodes={orgUnitTree}
              rowState={orgUnitRowState}
              busyById={busyById}
              expandedId={expandedOrgUnitId}
              setExpandedId={setExpandedOrgUnitId}
              setRowState={setOrgUnitRowState}
              onSave={onSaveOrgUnit}
              onDelete={onDeleteOrgUnit}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
