'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import { IUser } from '@/interfaces/IUser';
import { IDepartment } from '@/interfaces/IDepartment';
import { useAuth } from '@/context/auth-context';
import Loading from '@/app/loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Role } from '@/enums/RoleEnum';
import { extractListItems, ListResponse } from '@/lib/list-response';

const NO_DEPARTMENT_VALUE = '__none__';

type CreateUserForm = {
  email: string;
  password: string;
  name: string;
  position: string;
  role: Role;
  departmentId: string;
};

const initialCreateForm: CreateUserForm = {
  email: '',
  password: '',
  name: '',
  position: '',
  role: Role.Regular,
  departmentId: '',
};

function roleLabel(role: Role): string {
  if (role === Role.Admin) return 'Admin';
  if (role === Role.Manager) return 'Department Head';
  return 'Employee';
}

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

export default function UsersTable() {
  const { loading, accessToken, user } = useAuth();
  const [users, setUsers] = useState<IUser[]>([]);
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [createForm, setCreateForm] = useState<CreateUserForm>(initialCreateForm);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [busyByUserId, setBusyByUserId] = useState<Record<number, boolean>>({});
  const [pageError, setPageError] = useState<string | null>(null);

  const isAdmin = user?.role === Role.Admin;
  const isManager = user?.role === Role.Manager;
  const canReadUsers = isAdmin || isManager;
  const managerDepartmentId = user?.department?.id ?? null;

  const loadUsers = useCallback(async () => {
    if (!canReadUsers) return;
    const params: Record<string, string | number> = {};
    if (isManager && managerDepartmentId) {
      params.departmentId = managerDepartmentId;
    } else if (departmentFilter !== 'all') {
      params.departmentId = Number(departmentFilter);
    }
    if (search.trim()) {
      params.q = search.trim();
    }
    const res = await api.get<ListResponse<IUser> | IUser[]>('/users', { params });
    setUsers(extractListItems(res.data));
  }, [canReadUsers, departmentFilter, isManager, managerDepartmentId, search]);

  const loadDepartments = useCallback(async () => {
    const res = await api.get<IDepartment[]>('/department');
    setDepartments(res.data);
  }, []);

  useEffect(() => {
    if (!accessToken || !canReadUsers) return;
    loadDepartments().catch((error) => {
      console.error(error);
      setPageError(getApiErrorMessage(error, 'Failed to load staff data'));
    });
  }, [accessToken, canReadUsers, loadDepartments]);

  useEffect(() => {
    if (!accessToken || !canReadUsers) return;
    loadUsers().catch((error) => {
      console.error(error);
      setPageError(getApiErrorMessage(error, 'Failed to filter users'));
    });
  }, [accessToken, canReadUsers, loadUsers]);

  useEffect(() => {
    if (isManager && managerDepartmentId) {
      setCreateForm((prev) => ({ ...prev, departmentId: String(managerDepartmentId) }));
    }
  }, [isManager, managerDepartmentId]);

  const setRowBusy = (userId: number, value: boolean) => {
    setBusyByUserId((prev) => ({ ...prev, [userId]: value }));
  };

  const onCreateUser = async (event: FormEvent) => {
    event.preventDefault();
    setIsCreating(true);
    setPageError(null);
    try {
      await api.post('/users', {
        email: createForm.email,
        password: createForm.password,
        name: createForm.name,
        position: createForm.position || undefined,
        role: createForm.role,
        departmentId: createForm.departmentId ? Number(createForm.departmentId) : undefined,
      });
      setCreateForm({
        ...initialCreateForm,
        departmentId: isManager && managerDepartmentId ? String(managerDepartmentId) : '',
      });
      await loadUsers();
    } catch (error: unknown) {
      console.error(error);
      setPageError(getApiErrorMessage(error, 'Failed to create user'));
    } finally {
      setIsCreating(false);
    }
  };

  const onUpdatePosition = async (target: IUser, position: string) => {
    setRowBusy(target.id, true);
    setPageError(null);
    try {
      await api.patch(`/users/${target.id}`, { position: position || null });
      await loadUsers();
    } catch (error: unknown) {
      console.error(error);
      setPageError(getApiErrorMessage(error, 'Failed to update profile'));
    } finally {
      setRowBusy(target.id, false);
    }
  };

  const onToggleActive = async (target: IUser) => {
    if (!isAdmin) return;
    setRowBusy(target.id, true);
    setPageError(null);
    try {
      await api.patch(`/users/${target.id}/active`, {
        isActive: !target.isActive,
      });
      await loadUsers();
    } catch (error: unknown) {
      console.error(error);
      setPageError(getApiErrorMessage(error, 'Failed to update activity status'));
    } finally {
      setRowBusy(target.id, false);
    }
  };

  const allowedCreateRoles = useMemo(() => {
    if (isAdmin) return [Role.Regular, Role.Manager];
    if (isManager) return [Role.Regular];
    return [];
  }, [isAdmin, isManager]);

  if (loading || !accessToken) {
    return <Loading />;
  }

  if (!canReadUsers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Staff Workspace</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Access denied. Only Admin and Department Head can access this section.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {isAdmin ? (
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/users/import">Bulk Import</Link>
          </Button>
        </div>
      ) : null}

      {pageError ? (
        <Card className="border-red-300">
          <CardContent className="pt-6 text-sm text-red-600">{pageError}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            {isAdmin ? 'Create Staff User' : 'Create Department Employee'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isManager ? (
            <p className="mb-3 text-xs text-muted-foreground">
              Department Head can create users only in own department.
            </p>
          ) : null}
          <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onCreateUser}>
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={createForm.email}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, email: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={createForm.password}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, password: event.target.value }))
                }
                minLength={6}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={createForm.position}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, position: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select
                value={createForm.role}
                onValueChange={(value: Role) =>
                  setCreateForm((prev) => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedCreateRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {roleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <Select
                value={createForm.departmentId || NO_DEPARTMENT_VALUE}
                onValueChange={(value) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    departmentId: value === NO_DEPARTMENT_VALUE ? '' : value,
                  }))
                }
                disabled={isManager}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DEPARTMENT_VALUE}>No department</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={String(department.id)}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input
              value={search}
              placeholder="Search by name or email"
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select
              value={departmentFilter}
              onValueChange={setDepartmentFilter}
              disabled={isManager}
            >
              <SelectTrigger>
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={String(department.id)}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found for selected filters.</p>
          ) : (
            <div className="space-y-3">
              {users.map((item) => (
                <div key={item.id} className="rounded border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Department: {item.department?.name ?? '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{roleLabel(item.role)}</Badge>
                      <Badge variant={item.isActive ? 'default' : 'secondary'}>
                        {item.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <div className="min-w-56 flex-1">
                      <Label className="text-xs">Position</Label>
                      <Input
                        defaultValue={item.position ?? ''}
                        onBlur={(event) => {
                          const nextPosition = event.target.value.trim();
                          if ((item.position ?? '') !== nextPosition) {
                            void onUpdatePosition(item, nextPosition);
                          }
                        }}
                      />
                    </div>
                    {isAdmin ? (
                      <Button
                        variant="outline"
                        disabled={busyByUserId[item.id]}
                        onClick={() => onToggleActive(item)}
                      >
                        {busyByUserId[item.id]
                          ? 'Updating...'
                          : item.isActive
                            ? 'Disable'
                            : 'Enable'}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
