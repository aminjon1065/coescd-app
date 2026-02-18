'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Role } from '@/enums/RoleEnum';

const AVAILABLE_PERMISSIONS = [
  'users.read',
  'users.create',
  'users.update',
  'users.delete',
  'departments.read',
  'departments.create',
  'departments.update',
  'departments.delete',
  'documents.read',
  'documents.create',
  'documents.update',
  'documents.delete',
  'tasks.read',
  'tasks.create',
  'tasks.update',
  'tasks.delete',
  'tasks.assign',
  'analytics.read',
  'analytics.write',
  'reports.read',
  'reports.generate',
  'gis.read',
  'gis.write',
  'files.read',
  'files.write',
  'files.delete',
] as const;
const AVAILABLE_PERMISSION_SET = new Set<string>(AVAILABLE_PERMISSIONS);
const NO_DEPARTMENT_VALUE = '__none__';

type CreateUserForm = {
  email: string;
  password: string;
  name: string;
  position: string;
  avatar: string;
  role: Role;
  departmentId: string;
};

type RowEditState = {
  role: Role;
  position: string;
  departmentId: string;
  permissionsText: string;
};

const initialCreateForm: CreateUserForm = {
  email: '',
  password: '',
  name: '',
  position: '',
  avatar: '',
  role: Role.Regular,
  departmentId: '',
};

function roleLabel(role: Role): string {
  if (role === Role.Admin) return 'Admin';
  if (role === Role.Manager) return 'Manager';
  return 'Regular';
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
  const [rowEdits, setRowEdits] = useState<Record<number, RowEditState>>({});
  const [busyByUserId, setBusyByUserId] = useState<Record<number, boolean>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const isAdmin = useMemo(() => user?.role === Role.Admin, [user?.role]);

  const loadUsers = async () => {
    const res = await api.get<IUser[]>('/users');
    setUsers(res.data);
    setRowEdits((prev) => {
      const next = { ...prev };
      for (const item of res.data) {
        next[item.id] = next[item.id] ?? {
          role: item.role,
          position: item.position ?? '',
          departmentId: item.department?.id ? String(item.department.id) : '',
          permissionsText: item.permissions.join(', '),
        };
      }
      return next;
    });
  };

  const loadDepartments = async () => {
    const res = await api.get<IDepartment[]>('/department');
    setDepartments(res.data);
  };

  useEffect(() => {
    if (!accessToken) return;
    Promise.all([loadUsers(), loadDepartments()]).catch((error) => {
      console.error(error);
      setPageError('Failed to load users data');
    });
  }, [accessToken]);

  const setRowBusy = (userId: number, value: boolean) => {
    setBusyByUserId((prev) => ({ ...prev, [userId]: value }));
  };

  const parsePermissions = (text: string): string[] => {
    const unique = new Set(
      text
        .split(/[\n,]+/)
        .map((value) => value.trim())
        .filter((value) => AVAILABLE_PERMISSION_SET.has(value)),
    );
    return Array.from(unique);
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
        avatar: createForm.avatar || undefined,
        role: createForm.role,
        departmentId: createForm.departmentId ? Number(createForm.departmentId) : undefined,
      });
      setCreateForm(initialCreateForm);
      await loadUsers();
    } catch (error: unknown) {
      console.error(error);
      setPageError(getApiErrorMessage(error, 'Failed to create user'));
    } finally {
      setIsCreating(false);
    }
  };

  const onSaveProfile = async (target: IUser) => {
    const edit = rowEdits[target.id];
    if (!edit) return;
    setRowBusy(target.id, true);
    setPageError(null);
    try {
      await api.patch(`/users/${target.id}`, {
        role: edit.role,
        position: edit.position || null,
        departmentId: edit.departmentId ? Number(edit.departmentId) : undefined,
      });
      await loadUsers();
    } catch (error: unknown) {
      console.error(error);
      setPageError(getApiErrorMessage(error, 'Failed to update user profile'));
    } finally {
      setRowBusy(target.id, false);
    }
  };

  const onToggleActive = async (target: IUser) => {
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

  const onSavePermissions = async (target: IUser) => {
    const edit = rowEdits[target.id];
    if (!edit) return;
    setRowBusy(target.id, true);
    setPageError(null);
    try {
      await api.patch(`/users/${target.id}/permissions`, {
        permissions: parsePermissions(edit.permissionsText),
      });
      await loadUsers();
    } catch (error: unknown) {
      console.error(error);
      setPageError(getApiErrorMessage(error, 'Failed to update permissions'));
    } finally {
      setRowBusy(target.id, false);
    }
  };

  if (loading || !accessToken) {
    return <Loading />;
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Users Admin</CardTitle>
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
          <CardTitle>Create User</CardTitle>
        </CardHeader>
        <CardContent>
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
              <Label htmlFor="avatar">Avatar URL</Label>
              <Input
                id="avatar"
                value={createForm.avatar}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, avatar: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select
                value={createForm.role}
                onValueChange={(value) =>
                  setCreateForm((prev) => ({ ...prev, role: value as Role }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Role.Admin}>Admin</SelectItem>
                  <SelectItem value={Role.Manager}>Manager</SelectItem>
                  <SelectItem value={Role.Regular}>Regular</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Department</Label>
              <Select
                value={createForm.departmentId || NO_DEPARTMENT_VALUE}
                onValueChange={(value) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    departmentId: value === NO_DEPARTMENT_VALUE ? '' : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
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
          <CardTitle>Manage Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {users.map((item) => {
            const edit = rowEdits[item.id];
            const busy = Boolean(busyByUserId[item.id]);
            if (!edit) {
              return null;
            }

            return (
              <div key={item.id} className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-muted-foreground">{item.email}</div>
                  </div>
                  <Badge variant={item.isActive ? 'default' : 'secondary'}>
                    {item.isActive ? 'Active' : 'Disabled'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Role</Label>
                    <Select
                      value={edit.role}
                      onValueChange={(value) =>
                        setRowEdits((prev) => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], role: value as Role },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue>{roleLabel(edit.role)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={Role.Admin}>Admin</SelectItem>
                        <SelectItem value={Role.Manager}>Manager</SelectItem>
                        <SelectItem value={Role.Regular}>Regular</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Department</Label>
                    <Select
                      value={edit.departmentId || NO_DEPARTMENT_VALUE}
                      onValueChange={(value) =>
                        setRowEdits((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...prev[item.id],
                            departmentId: value === NO_DEPARTMENT_VALUE ? '' : value,
                          },
                        }))
                      }
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

                  <div className="space-y-1">
                    <Label>Position</Label>
                    <Input
                      value={edit.position}
                      onChange={(event) =>
                        setRowEdits((prev) => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], position: event.target.value },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="mt-3 space-y-1">
                  <Label>Custom Permissions (comma/newline separated)</Label>
                  <Textarea
                    value={edit.permissionsText}
                    onChange={(event) =>
                      setRowEdits((prev) => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], permissionsText: event.target.value },
                      }))
                    }
                    rows={3}
                  />
                  <div className="text-xs text-muted-foreground">
                    Allowed keys: {AVAILABLE_PERMISSIONS.join(', ')}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" disabled={busy} onClick={() => onSaveProfile(item)}>
                    Save Profile
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => onSavePermissions(item)}>
                    Save Permissions
                  </Button>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => onToggleActive(item)}>
                    {item.isActive ? 'Disable User' : 'Activate User'}
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
