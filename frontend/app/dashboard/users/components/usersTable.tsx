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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Role } from '@/enums/RoleEnum';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  ChevronRight,
  Loader2,
  Upload,
  UserPlus,
} from 'lucide-react';
import {
  useUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useToggleUserActiveMutation,
} from '@/hooks/queries/useUsers';
import { useDepartmentsQuery } from '@/hooks/queries/useDepartments';

// ── Constants ─────────────────────────────────────────────────────────────────

const NO_DEPARTMENT_VALUE = '__none__';

const ROLE_LABEL: Record<Role, string> = {
  [Role.Admin]:   'Администратор',
  [Role.Manager]: 'Руководитель',
  [Role.Regular]: 'Сотрудник',
};

const ROLE_CLASSES: Record<Role, string> = {
  [Role.Admin]:   'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  [Role.Manager]: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  [Role.Regular]: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
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

// ── User avatar ───────────────────────────────────────────────────────────────

function UserInitialsAvatar({ name, role }: { name: string; role: Role }) {
  const initials = getInitials(name);
  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold',
        role === Role.Admin
          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
          : role === Role.Manager
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
            : 'bg-muted text-muted-foreground',
      )}
    >
      {initials}
    </div>
  );
}

// ── Role badge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-current/10',
        ROLE_CLASSES[role],
      )}
    >
      {ROLE_LABEL[role]}
    </span>
  );
}

// ── Active badge ──────────────────────────────────────────────────────────────

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-current/10',
        active
          ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
      )}
    >
      {active ? 'Активен' : 'Отключён'}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function UsersTable() {
  const { loading, accessToken, user } = useAuth();

  const [createForm, setCreateForm] = useState<CreateUserForm>(initialCreateForm);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [pageError, setPageError] = useState<string | null>(null);
  const [busyByUserId, setBusyByUserId] = useState<Record<number, boolean>>({});

  const isAdmin = user?.role === Role.Admin;
  const isManager = user?.role === Role.Manager;
  const canReadUsers = isAdmin || isManager;
  const canCreateUsers = hasAnyPermission(user, [Permission.USERS_CREATE]);
  const canUpdateUsers = hasAnyPermission(user, [Permission.USERS_UPDATE]);
  const managerDepartmentId = user?.department?.id ?? null;

  const { data: departments = [], isError: deptError } = useDepartmentsQuery(
    !!accessToken && canReadUsers,
  );

  const {
    data: users = [],
    isLoading: usersLoading,
    isError: usersError,
  } = useUsersQuery(
    { search, departmentId: departmentFilter, isManager, managerDepartmentId },
    !!accessToken && canReadUsers,
  );

  const createUserMutation = useCreateUserMutation();
  const updateUserMutation = useUpdateUserMutation();
  const toggleActiveMutation = useToggleUserActiveMutation();

  const setRowBusy = (userId: number, busy: boolean) =>
    setBusyByUserId((prev) => ({ ...prev, [userId]: busy }));

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
        departmentId: createForm.departmentId ? Number(createForm.departmentId) : undefined,
      });
      setCreateForm({
        ...initialCreateForm,
        departmentId: isManager && managerDepartmentId ? String(managerDepartmentId) : '',
      });
      setShowCreateForm(false);
    } catch (error: unknown) {
      setPageError(getApiErrorMessage(error, 'Не удалось создать пользователя'));
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
      setPageError(getApiErrorMessage(error, 'Не удалось обновить должность'));
    } finally {
      setRowBusy(target.id, false);
    }
  };

  const onToggleActive = async (target: IUser) => {
    if (!isAdmin) return;
    setRowBusy(target.id, true);
    setPageError(null);
    try {
      await toggleActiveMutation.mutateAsync({ userId: target.id, isActive: !target.isActive });
    } catch (error: unknown) {
      setPageError(getApiErrorMessage(error, 'Не удалось изменить статус'));
    } finally {
      setRowBusy(target.id, false);
    }
  };

  const allowedCreateRoles = useMemo(() => {
    if (isAdmin) return [Role.Regular, Role.Manager];
    if (isManager) return [Role.Regular];
    return [];
  }, [isAdmin, isManager]);

  if (loading || !accessToken) return <Loading />;

  if (!canReadUsers) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Доступ запрещён. Только Администратор и Руководитель могут просматривать этот раздел.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Top toolbar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Сотрудники</h1>
          <p className="text-xs text-muted-foreground">
            {users.length} {users.length === 1 ? 'пользователь' : 'пользователей'}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/dashboard/users/import">
                <Upload className="h-4 w-4" />
                Импорт
              </Link>
            </Button>
          )}
          {canCreateUsers && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setShowCreateForm((v) => !v)}
            >
              <UserPlus className="h-4 w-4" />
              Добавить
            </Button>
          )}
        </div>
      </div>

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {(pageError || usersError || deptError) && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {pageError ??
            (usersError ? 'Не удалось загрузить список сотрудников.' : 'Не удалось загрузить подразделения.')}
        </div>
      )}

      {/* ── Create user form ─────────────────────────────────────────────── */}
      {canCreateUsers && showCreateForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {isAdmin ? 'Новый пользователь' : 'Новый сотрудник подразделения'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isManager && (
              <p className="mb-3 text-xs text-muted-foreground">
                Руководитель может создавать сотрудников только своего подразделения.
              </p>
            )}
            <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onCreateUser}>
              <div className="space-y-1.5">
                <Label htmlFor="name">Имя</Label>
                <Input
                  id="name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                  minLength={6}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="position">Должность</Label>
                <Input
                  id="position"
                  value={createForm.position}
                  onChange={(e) => setCreateForm((p) => ({ ...p, position: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Роль</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(v: Role) => setCreateForm((p) => ({ ...p, role: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedCreateRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABEL[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Подразделение</Label>
                <Select
                  value={createForm.departmentId || NO_DEPARTMENT_VALUE}
                  onValueChange={(v) =>
                    setCreateForm((p) => ({
                      ...p,
                      departmentId: v === NO_DEPARTMENT_VALUE ? '' : v,
                    }))
                  }
                  disabled={isManager}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Не указано" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_DEPARTMENT_VALUE}>Не указано</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={String(dept.id)}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={createUserMutation.isPending} className="gap-1.5">
                  {createUserMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {createUserMutation.isPending ? 'Создание...' : 'Создать пользователя'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateForm(false)}
                >
                  Отмена
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Directory ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1">
              <Input
                value={search}
                placeholder="Поиск по имени или email…"
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <Select
              value={departmentFilter}
              onValueChange={setDepartmentFilter}
              disabled={isManager}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Все подразделения" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все подразделения</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {usersLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Пользователи не найдены
            </p>
          ) : (
            <div className="space-y-1.5">
              {users.map((item) => (
                <UserRow
                  key={item.id}
                  item={item}
                  canUpdate={canUpdateUsers}
                  isAdmin={isAdmin}
                  isBusy={!!busyByUserId[item.id]}
                  onUpdatePosition={onUpdatePosition}
                  onToggleActive={onToggleActive}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── User row ──────────────────────────────────────────────────────────────────

function UserRow({
  item,
  canUpdate,
  isAdmin,
  isBusy,
  onUpdatePosition,
  onToggleActive,
}: {
  item: IUser;
  canUpdate: boolean;
  isAdmin: boolean;
  isBusy: boolean;
  onUpdatePosition: (user: IUser, pos: string) => void;
  onToggleActive: (user: IUser) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="group rounded-lg border p-3 transition-colors hover:bg-muted/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Avatar + info */}
        <div className="flex min-w-0 items-start gap-3">
          <UserInitialsAvatar name={item.name} role={item.role as Role} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-medium leading-tight">{item.name}</p>
              <RoleBadge role={item.role as Role} />
              <ActiveBadge active={item.isActive} />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.email}</p>
            <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              {item.department && <span>{item.department.name}</span>}
              {item.position && <span>{item.position}</span>}
            </div>
          </div>
        </div>

        {/* Actions */}
        {canUpdate && (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs"
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? 'Готово' : 'Изменить'}
              {!editing && <ChevronRight className="h-3 w-3" />}
            </Button>
          </div>
        )}
      </div>

      {/* Inline edit row */}
      {editing && canUpdate && (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3">
          <div className="flex-1 min-w-48 space-y-1">
            <Label className="text-xs">Должность</Label>
            <Input
              defaultValue={item.position ?? ''}
              className="h-8 text-sm"
              onBlur={(e) => {
                const next = e.target.value.trim();
                if ((item.position ?? '') !== next) {
                  onUpdatePosition(item, next);
                }
              }}
            />
          </div>
          {isAdmin && (
            <Button
              size="sm"
              variant={item.isActive ? 'destructive' : 'outline'}
              className="h-8 text-xs"
              disabled={isBusy}
              onClick={() => onToggleActive(item)}
            >
              {isBusy ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : item.isActive ? (
                'Деактивировать'
              ) : (
                'Активировать'
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
