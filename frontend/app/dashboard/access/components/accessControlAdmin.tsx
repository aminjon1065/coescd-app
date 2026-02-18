'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/axios';
import Loading from '@/app/loading';
import { useAuth } from '@/context/auth-context';
import { Role } from '@/enums/RoleEnum';
import { IUser } from '@/interfaces/IUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

const ROLES: Role[] = [Role.Admin, Role.Manager, Role.Regular];

type RolePermissionsMatrix = Record<Role, string[]>;

type AuthorizationMatrixResponse = {
  permissions: string[];
  rolePermissions: RolePermissionsMatrix;
};

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

function permissionGroupKey(permission: string): string {
  const [prefix] = permission.split('.');
  return prefix ?? 'other';
}

function titleCase(input: string): string {
  return input.charAt(0).toUpperCase() + input.slice(1);
}

function roleLabel(role: Role): string {
  if (role === Role.Admin) return 'Admin';
  if (role === Role.Manager) return 'Manager';
  return 'Regular';
}

export default function AccessControlAdmin() {
  const { loading, accessToken, user } = useAuth();
  const [users, setUsers] = useState<IUser[]>([]);
  const [matrix, setMatrix] = useState<AuthorizationMatrixResponse | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [customPermissions, setCustomPermissions] = useState<string[]>([]);
  const [isSavingCustom, setIsSavingCustom] = useState(false);
  const [isSavingMatrix, setIsSavingMatrix] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const isAdmin = useMemo(() => user?.role === Role.Admin, [user?.role]);
  const selectedUser = useMemo(
    () => users.find((item) => String(item.id) === selectedUserId) ?? null,
    [users, selectedUserId],
  );

  const groupedPermissions = useMemo(() => {
    const source = matrix?.permissions ?? [];
    return source.reduce<Record<string, string[]>>((acc, permission) => {
      const key = permissionGroupKey(permission);
      if (!acc[key]) acc[key] = [];
      acc[key].push(permission);
      return acc;
    }, {});
  }, [matrix?.permissions]);

  const loadData = async () => {
    const [usersRes, matrixRes] = await Promise.all([
      api.get<IUser[]>('/users'),
      api.get<AuthorizationMatrixResponse>('/iam/authorization/matrix'),
    ]);
    setUsers(usersRes.data);
    setMatrix(matrixRes.data);

    const firstUser = usersRes.data[0];
    if (firstUser) {
      setSelectedUserId(String(firstUser.id));
      setCustomPermissions(
        firstUser.permissions.filter((permission) => {
          const defaults = matrixRes.data.rolePermissions[firstUser.role] ?? [];
          return !defaults.includes(permission);
        }),
      );
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    loadData().catch((error) => {
      console.error(error);
      setPageError(getApiErrorMessage(error, 'Failed to load access-control data'));
    });
  }, [accessToken]);

  useEffect(() => {
    if (!selectedUser || !matrix) return;
    const defaults = matrix.rolePermissions[selectedUser.role] ?? [];
    setCustomPermissions(
      selectedUser.permissions.filter((permission) => !defaults.includes(permission)),
    );
  }, [selectedUser, matrix]);

  const onTogglePermission = (permission: string, checked: boolean) => {
    setCustomPermissions((prev) => {
      const next = new Set(prev);
      if (checked) next.add(permission);
      else next.delete(permission);
      return Array.from(next);
    });
  };

  const onToggleRolePermission = (role: Role, permission: string, checked: boolean) => {
    setMatrix((prev) => {
      if (!prev) return prev;
      const roleSet = new Set(prev.rolePermissions[role] ?? []);
      if (checked) roleSet.add(permission);
      else roleSet.delete(permission);
      return {
        ...prev,
        rolePermissions: {
          ...prev.rolePermissions,
          [role]: Array.from(roleSet),
        },
      };
    });
  };

  const onSaveMatrix = async () => {
    if (!matrix) return;
    setIsSavingMatrix(true);
    setPageError(null);
    try {
      const response = await api.put<AuthorizationMatrixResponse>('/iam/authorization/matrix', {
        rolePermissions: matrix.rolePermissions,
      });
      setMatrix(response.data);

      if (selectedUser) {
        const defaults = response.data.rolePermissions[selectedUser.role] ?? [];
        setCustomPermissions(
          selectedUser.permissions.filter((permission) => !defaults.includes(permission)),
        );
      }
    } catch (error: unknown) {
      console.error(error);
      setPageError(getApiErrorMessage(error, 'Failed to update role matrix'));
    } finally {
      setIsSavingMatrix(false);
    }
  };

  const onSaveCustomPermissions = async () => {
    if (!selectedUser) return;
    setIsSavingCustom(true);
    setPageError(null);
    try {
      await api.patch(`/users/${selectedUser.id}/permissions`, {
        permissions: customPermissions,
      });
      await loadData();
    } catch (error: unknown) {
      console.error(error);
      setPageError(getApiErrorMessage(error, 'Failed to update custom permissions'));
    } finally {
      setIsSavingCustom(false);
    }
  };

  if (loading || !accessToken) {
    return <Loading />;
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Control</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Access denied. Admin role is required.
        </CardContent>
      </Card>
    );
  }

  if (!matrix) {
    return <Loading />;
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
          <CardTitle>Role Permissions Matrix</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 text-sm font-medium">
            <div>Permission</div>
            {ROLES.map((role) => (
              <div key={role}>{roleLabel(role)}</div>
            ))}
          </div>

          {matrix.permissions.map((permission) => (
            <div
              key={permission}
              className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-2 rounded border p-2 text-sm"
            >
              <div className="font-mono">{permission}</div>
              {ROLES.map((role) => {
                const checked = matrix.rolePermissions[role]?.includes(permission) ?? false;
                return (
                  <label key={`${permission}-${role}`} className="inline-flex items-center gap-2">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) =>
                        onToggleRolePermission(role, permission, Boolean(value))
                      }
                    />
                    <Badge variant={checked ? 'default' : 'secondary'}>
                      {checked ? 'Yes' : 'No'}
                    </Badge>
                  </label>
                );
              })}
            </div>
          ))}

          <Button onClick={onSaveMatrix} disabled={isSavingMatrix}>
            {isSavingMatrix ? 'Saving...' : 'Save Role Matrix'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Custom Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-sm">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.name} ({item.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedUser ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Role defaults for <span className="font-medium">{selectedUser.role}</span> are applied automatically.
                Select only additional permissions below.
              </div>

              {Object.entries(groupedPermissions).map(([groupKey, permissions]) => (
                <div key={groupKey} className="rounded border p-3">
                  <div className="mb-2 font-medium">{titleCase(groupKey)}</div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {permissions.map((permission) => {
                      const roleDefaults = matrix.rolePermissions[selectedUser.role] ?? [];
                      const isDefault = roleDefaults.includes(permission);
                      const isChecked = isDefault || customPermissions.includes(permission);
                      return (
                        <label key={permission} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={isChecked}
                            disabled={isDefault}
                            onCheckedChange={(checked) =>
                              onTogglePermission(permission, Boolean(checked))
                            }
                          />
                          <span className="font-mono">{permission}</span>
                          {isDefault ? <Badge variant="outline">role default</Badge> : null}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              <Button onClick={onSaveCustomPermissions} disabled={isSavingCustom}>
                {isSavingCustom ? 'Saving...' : 'Save Custom Permissions'}
              </Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No users found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
