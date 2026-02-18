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

export default function AccessControlAdmin() {
  const { loading, accessToken, user } = useAuth();
  const [users, setUsers] = useState<IUser[]>([]);
  const [matrix, setMatrix] = useState<AuthorizationMatrixResponse | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [customPermissions, setCustomPermissions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
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
      setCustomPermissions(firstUser.permissions.filter((permission) => {
        const defaults = matrixRes.data.rolePermissions[firstUser.role] ?? [];
        return !defaults.includes(permission);
      }));
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

  const onSaveCustomPermissions = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
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
      setIsSaving(false);
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
            <div>Admin</div>
            <div>Manager</div>
            <div>Regular</div>
          </div>

          {matrix.permissions.map((permission) => (
            <div key={permission} className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-2 rounded border p-2 text-sm">
              <div className="font-mono">{permission}</div>
              <div>
                <Badge variant={matrix.rolePermissions.admin.includes(permission) ? 'default' : 'secondary'}>
                  {matrix.rolePermissions.admin.includes(permission) ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div>
                <Badge variant={matrix.rolePermissions.manager.includes(permission) ? 'default' : 'secondary'}>
                  {matrix.rolePermissions.manager.includes(permission) ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div>
                <Badge variant={matrix.rolePermissions.regular.includes(permission) ? 'default' : 'secondary'}>
                  {matrix.rolePermissions.regular.includes(permission) ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          ))}
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

              <Button onClick={onSaveCustomPermissions} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Custom Permissions'}
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
