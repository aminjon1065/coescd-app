'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { labelBusinessRole, sortBusinessRoles } from '@/lib/roles';

export type RolePermissionsMatrix = Record<string, string[]>;

type AuthorizationMatrix = {
  permissions: string[];
  rolePermissions: RolePermissionsMatrix;
};

interface RoleMatrixProps {
  matrix: AuthorizationMatrix;
  isSaving: boolean;
  onToggleRolePermission: (role: string, permission: string, checked: boolean) => void;
  onSave: () => void;
}

const PERMISSION_DOMAIN_ORDER = [
  'users',
  'departments',
  'documents',
  'tasks',
  'analytics',
  'reports',
  'gis',
  'files',
] as const;

const PERMISSION_DOMAIN_LABELS: Record<string, string> = {
  users: 'Users',
  departments: 'Departments',
  documents: 'Documents',
  tasks: 'Tasks',
  analytics: 'Analytics',
  reports: 'Reports',
  gis: 'GIS',
  files: 'Files',
  other: 'Other',
};

function permissionDomain(permission: string): string {
  const [prefix] = permission.split('.');
  return prefix ?? 'other';
}

function groupPermissionsByDomain(permissions: string[]): Array<{ domain: string; permissions: string[] }> {
  const grouped = permissions.reduce<Record<string, string[]>>((acc, permission) => {
    const domain = permissionDomain(permission);
    if (!acc[domain]) {
      acc[domain] = [];
    }
    acc[domain].push(permission);
    return acc;
  }, {});

  const orderedDomains = [
    ...PERMISSION_DOMAIN_ORDER.filter((domain) => grouped[domain]?.length),
    ...Object.keys(grouped)
      .filter((domain) => !PERMISSION_DOMAIN_ORDER.includes(domain as (typeof PERMISSION_DOMAIN_ORDER)[number]))
      .sort((a, b) => a.localeCompare(b)),
  ];

  return orderedDomains.map((domain) => ({
    domain,
    permissions: grouped[domain].slice().sort((a, b) => a.localeCompare(b)),
  }));
}

export function RoleMatrix({ matrix, isSaving, onToggleRolePermission, onSave }: RoleMatrixProps) {
  const roles = sortBusinessRoles(Object.keys(matrix.rolePermissions ?? {}));
  const permissionGroups = groupPermissionsByDomain(matrix.permissions ?? []);
  const gridTemplateColumns = `minmax(260px, 2fr) repeat(${Math.max(roles.length, 1)}, minmax(110px, 1fr))`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Permissions Matrix</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {permissionGroups.map((group) => (
          <div key={group.domain} className="space-y-2">
            <div className="text-sm font-medium">
              {PERMISSION_DOMAIN_LABELS[group.domain] ?? labelBusinessRole(group.domain)}
            </div>
            <div className="overflow-x-auto rounded border">
              <div className="min-w-max p-2">
                <div className="grid gap-2 text-sm font-medium" style={{ gridTemplateColumns }}>
                  <div>Permission</div>
                  {roles.map((role) => (
                    <div key={role}>{labelBusinessRole(role)}</div>
                  ))}
                </div>

                {group.permissions.map((permission) => (
                  <div
                    key={permission}
                    className="mt-2 grid items-center gap-2 rounded border p-2 text-sm"
                    style={{ gridTemplateColumns }}
                  >
                    <div className="font-mono">{permission}</div>
                    {roles.map((role) => {
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
              </div>
            </div>
          </div>
        ))}

        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Role Matrix'}
        </Button>
      </CardContent>
    </Card>
  );
}

