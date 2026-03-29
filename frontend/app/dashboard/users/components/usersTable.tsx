'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { IUser } from '@/interfaces/IUser';
import { useAuth } from '@/context/auth-context';
import { hasAnyPermission, Permission } from '@/lib/permissions';
import Loading from '@/app/loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Role } from '@/enums/RoleEnum';
import {
  useUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useToggleUserActiveMutation,
} from '@/hooks/queries/useUsers';
import { useDepartmentsQuery } from '@/hooks/queries/useDepartments';

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
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

export default function UsersTable() {
  const { loading, accessToken, user } = useAuth();

  // ── Local UI state ────────────────────────────────────────────────────────
  const [createForm, setCreateForm] = useState<CreateUserForm>(initialCreateForm);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [pageError, setPageError] = useState<string | null>(null);
  // Per-row busy tracking for toggle/update actions (not covered by a single
  // mutation isPending because multiple rows can be in-flight at once).
  const [busyByUserId, setBusyByUserId] = useState<Record<number, boolean>>({});

  // ── Derived auth values ───────────────────────────────────────────────────
  const isAdmin = user?.role === Role.Admin;
  const isManager = user?.role === Role.Manager;
  const canReadUsers = isAdmin || isManager;
  const canCreateUsers = hasAnyPermission(user, [Permission.USERS_CREATE]);
  const canUpdateUsers = hasAnyPermission(user, [Permission.USERS_UPDATE]);
  const managerDepartmentId = user?.department?.id ?? null;

  // ── Queries ───────────────────────────────────────────────────────────────
  // Departments are cached for 5 minutes — no loading flicker on re-mount.
  const { data: departments = [], isError: deptError } = useDepartmentsQuery(
    !!accessToken && canReadUsers,
  );

  // The full filter object is the query key — changing any field auto-refetches.
  const {
    data: users = [],
    isLoading: usersLoading,
    isError: usersError,
  } = useUsersQuery(
    { search, departmentId: departmentFilter, isManager, managerDepartmentId },
    !!accessToken && canReadUsers,
  );

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createUserMutation = useCreateUserMutation();
  const updateUserMutation = useUpdateUserMutation();
  const toggleActiveMutation = useToggleUserActiveMutation();

  const setRowBusy = (userId: number, busy: boolean) =>
    setBusyByUserId((prev) => ({ ...prev, [userId]: busy }));

  // ── Handlers ──────────────────────────────────────────────────────────────
  const onCreateUser = async (event: FormEvent) => {
    event.preventDefault();
    setPageError(null);
    try {
      await createUserMutation.mutateAsync({
        email: createForm.email,
        password: createForm.password,
        name: createForm.name,
        position: createForm.position || undefined,
        role: createForm.role,
        departmentId: createForm.departmentId
          ? Number(createForm.departmentId)
          : undefined,
      });
      // Reset form, preserve manager's department
      setCreateForm({
        ...initialCreateForm,
        departmentId:
          isManager && managerDepartmentId
            ? String(managerDepartmentId)
            : '',
      });
    } catch (error: unknown) {
      console.error(error);
      setPageError(getApiErrorMessage(error, 'Failed to create user'));
    }
  };

  const onUpdatePosition = async (target: IUser, position: string) => {
    setRowBusy(target.id, true);
    setPageError(null);
    try {
      await updateUserMutation.mutateAsync({
        userId: target.id,
        data: { position: position || null },
      });
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
      await toggleActiveMutation.mutateAsync({
        userId: target.id,
        isActive: !target.isActive,
      });
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

  // ── Early returns ─────────────────────────────────────────────────────────
  if (loading || !accessToken) return <Loading />;

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

      {/* Inline error banner for mutation errors */}
      {(pageError || usersError || deptError) && (
        <Card className="border-red-300">
          <CardContent className="pt-6 text-sm text-red-600">
            {pageError ??
              (usersError
                ? 'Не удалось загрузить список сотрудников.'
                : 'Не удалось загрузить список отделов.')}
          </CardContent>
        </Card>
      )}

      {/* ── Create user form ─────────────────────────────────────────────── */}
      {canCreateUsers && (
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
            <form
              className="grid grid-cols-1 gap-3 md:grid-cols-2"
              onSubmit={onCreateUser}
            >
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, name: e.target.value }))
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
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, email: e.target.value }))
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
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, password: e.target.value }))
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
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, position: e.target.value }))
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
                      departmentId:
                        value === NO_DEPARTMENT_VALUE ? '' : value,
                    }))
                  }
                  disabled={isManager}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_DEPARTMENT_VALUE}>
                      No department
                    </SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={String(dept.id)}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Button
                  type="submit"
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Staff directory ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input
              value={search}
              placeholder="Search by name or email"
              onChange={(e) => setSearch(e.target.value)}
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
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {usersLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка…</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No users found for selected filters.
            </p>
          ) : (
            <div className="space-y-3">
              {users.map((item) => (
                <div key={item.id} className="rounded border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Department: {item.department?.name ?? '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{roleLabel(item.role)}</Badge>
                      <Badge
                        variant={item.isActive ? 'default' : 'secondary'}
                      >
                        {item.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <div className="min-w-56 flex-1">
                      <Label className="text-xs">Position</Label>
                      <Input
                        defaultValue={item.position ?? ''}
                        disabled={!canUpdateUsers}
                        onBlur={(e) => {
                          if (!canUpdateUsers) return;
                          const next = e.target.value.trim();
                          if ((item.position ?? '') !== next) {
                            void onUpdatePosition(item, next);
                          }
                        }}
                      />
                    </div>
                    {canUpdateUsers ? (
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
