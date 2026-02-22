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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { extractListItems, ListResponse } from '@/lib/list-response';

const NONE_VALUE = '__none__';

type DepartmentFormState = {
  name: string;
  type: DepartmentEnum;
  parentId: string;
  chiefId: string;
};

type DepartmentRowState = DepartmentFormState;

const CREATE_INITIAL_STATE: DepartmentFormState = {
  name: '',
  type: DepartmentEnum.SECTION,
  parentId: '',
  chiefId: '',
};

const DEPARTMENT_TYPES: DepartmentEnum[] = [
  DepartmentEnum.MAIN,
  DepartmentEnum.MANAGEMENT,
  DepartmentEnum.DIVISION,
  DepartmentEnum.SECTION,
];

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    if (typeof message === 'string') {
      return message;
    }
  }
  return fallback;
}

export default function DepartmentsAdmin() {
  const { loading, accessToken, user } = useAuth();
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [createForm, setCreateForm] = useState<DepartmentFormState>(CREATE_INITIAL_STATE);
  const [rowState, setRowState] = useState<Record<number, DepartmentRowState>>({});
  const [busyByDepartmentId, setBusyByDepartmentId] = useState<Record<number, boolean>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const isAdmin = useMemo(() => user?.role === Role.Admin, [user?.role]);

  const setRowBusy = (departmentId: number, value: boolean) => {
    setBusyByDepartmentId((prev) => ({ ...prev, [departmentId]: value }));
  };

  const loadData = async () => {
    const [departmentsRes, usersRes] = await Promise.all([
      api.get<ListResponse<IDepartment> | IDepartment[]>('/department'),
      api.get<ListResponse<IUser> | IUser[]>('/users'),
    ]);

    const departmentsPayload = extractListItems(departmentsRes.data);
    setDepartments(departmentsPayload);
    setUsers(extractListItems(usersRes.data));
    setRowState((prev) => {
      const next = { ...prev };
      for (const department of departmentsPayload) {
        next[department.id] = next[department.id] ?? {
          name: department.name,
          type: department.type,
          parentId: department.parent?.id ? String(department.parent.id) : '',
          chiefId: department.chief?.id ? String(department.chief.id) : '',
        };
      }
      return next;
    });
  };

  useEffect(() => {
    if (!accessToken) return;
    loadData().catch((error) => {
      console.error(error);
      setPageError(getApiErrorMessage(error, 'Failed to load departments data'));
    });
  }, [accessToken]);

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    setPageError(null);
    setIsCreating(true);
    try {
      await api.post('/department', {
        name: createForm.name,
        type: createForm.type,
        parentId: createForm.parentId ? Number(createForm.parentId) : undefined,
        chiefId: createForm.chiefId ? Number(createForm.chiefId) : undefined,
      });
      setCreateForm(CREATE_INITIAL_STATE);
      await loadData();
    } catch (error: unknown) {
      console.error(error);
      setPageError(getApiErrorMessage(error, 'Failed to create department'));
    } finally {
      setIsCreating(false);
    }
  };

  const onSave = async (department: IDepartment) => {
    const state = rowState[department.id];
    if (!state) return;
    setPageError(null);
    setRowBusy(department.id, true);
    try {
      await api.patch(`/department/${department.id}`, {
        name: state.name,
        type: state.type,
        parentId: state.parentId ? Number(state.parentId) : null,
        chiefId: state.chiefId ? Number(state.chiefId) : null,
      });
      await loadData();
    } catch (error: unknown) {
      console.error(error);
      setPageError(getApiErrorMessage(error, 'Failed to update department'));
    } finally {
      setRowBusy(department.id, false);
    }
  };

  const onDelete = async (department: IDepartment) => {
    setPageError(null);
    setRowBusy(department.id, true);
    try {
      await api.delete(`/department/${department.id}`);
      await loadData();
    } catch (error: unknown) {
      console.error(error);
      setPageError(getApiErrorMessage(error, 'Failed to delete department'));
    } finally {
      setRowBusy(department.id, false);
    }
  };

  if (loading || !accessToken) {
    return <Loading />;
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Departments Admin</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Access denied. Admin role is required.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {pageError ? (
        <Card className="border-red-300">
          <CardContent className="pt-6 text-sm text-red-600">{pageError}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Create Department</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onCreate}>
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-1">
              <Label>Type</Label>
              <Select
                value={createForm.type}
                onValueChange={(value) =>
                  setCreateForm((prev) => ({ ...prev, type: value as DepartmentEnum }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Parent Department</Label>
              <Select
                value={createForm.parentId || NONE_VALUE}
                onValueChange={(value) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    parentId: value === NONE_VALUE ? '' : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No parent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No parent</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={String(department.id)}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Chief</Label>
              <Select
                value={createForm.chiefId || NONE_VALUE}
                onValueChange={(value) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    chiefId: value === NONE_VALUE ? '' : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No chief" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No chief</SelectItem>
                  {users.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name} ({item.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Department'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Departments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {departments.map((department) => {
            const state = rowState[department.id];
            const busy = Boolean(busyByDepartmentId[department.id]);
            if (!state) return null;

            return (
              <div key={department.id} className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{department.name}</div>
                    <div className="text-sm text-muted-foreground">
                      ID: {department.id}
                    </div>
                  </div>
                  <Badge variant="outline">{department.type}</Badge>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input
                      value={state.name}
                      onChange={(event) =>
                        setRowState((prev) => ({
                          ...prev,
                          [department.id]: {
                            ...prev[department.id],
                            name: event.target.value,
                          },
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Type</Label>
                    <Select
                      value={state.type}
                      onValueChange={(value) =>
                        setRowState((prev) => ({
                          ...prev,
                          [department.id]: {
                            ...prev[department.id],
                            type: value as DepartmentEnum,
                          },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Parent Department</Label>
                    <Select
                      value={state.parentId || NONE_VALUE}
                      onValueChange={(value) =>
                        setRowState((prev) => ({
                          ...prev,
                          [department.id]: {
                            ...prev[department.id],
                            parentId: value === NONE_VALUE ? '' : value,
                          },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No parent" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>No parent</SelectItem>
                        {departments
                          .filter((item) => item.id !== department.id)
                          .map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Chief</Label>
                    <Select
                      value={state.chiefId || NONE_VALUE}
                      onValueChange={(value) =>
                        setRowState((prev) => ({
                          ...prev,
                          [department.id]: {
                            ...prev[department.id],
                            chiefId: value === NONE_VALUE ? '' : value,
                          },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No chief" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>No chief</SelectItem>
                        {users.map((item) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.name} ({item.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" disabled={busy} onClick={() => onSave(department)}>
                    Save
                  </Button>
                  <Button size="sm" variant="destructive" disabled={busy} onClick={() => onDelete(department)}>
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
